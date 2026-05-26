import { z } from "zod";
import bcrypt from "bcryptjs";
import { randomUUID, createHash } from "crypto";
import jwt from "jsonwebtoken";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, protectedProcedure } from "../trpc.js";
import { users as usersTable, profiles as profilesTable, userRoles as userRolesTable, refreshTokens as refreshTokensTable, authAuditLogs as authAuditLogsTable } from "../db/schema.js";
import { eq, sql } from "drizzle-orm";

const JWT_SECRET = process.env.JWT_SECRET || "dev-only-secret-do-not-use-in-prod";
const TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function generateToken(userId: string) {
  const jti = randomUUID();
  return jwt.sign({ userId, jti }, JWT_SECRET, { expiresIn: "1h" });
}

async function createRefreshToken(userId: string, db: any) {
  const refreshToken = randomUUID();
  const hash = hashToken(refreshToken);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
  await db.insert(refreshTokensTable).values({
    id: randomUUID(),
    userId,
    tokenHash: hash,
    expiresAt,
    createdAt: new Date(),
  });
  return { refreshToken, expiresAt };
}

function generatePermissionsFromRoles(roles: string[]) {
  const permissions = new Set<string>();

  const rolePermissionMap: Record<string, string[]> = {
    sys_admin: [
      'ticket.read', 'ticket.create', 'ticket.update', 'ticket.assign', 'ticket.close',
      'wo.read', 'wo.create', 'wo.draft', 'wo.release', 'wo.assign', 'wo.complete', 'wo.close',
      'so.view', 'so.create', 'so.update',
      'inventory.view', 'inventory.procure', 'inventory.update',
      'warranty.view', 'warranty.create',
      'quote.view', 'quote.create',
      'invoice.view', 'invoice.create', 'invoice.pay',
      'finance.view', 'finance.create',
      'penalty.calculate',
      'sapos.view',
      'fraud.view', 'fraud.create',
      'admin.config', 'audit.read', 'mlops.view',
      'documents.view', 'customers.view', 'technicians.view', 'equipment.view',
      'contracts.view', 'partners.view', 'maintenance.view', 'portal.access',
      'attachment.upload',
    ],
    tenant_admin: [
      'ticket.read', 'ticket.create', 'ticket.update', 'ticket.assign',
      'wo.read', 'wo.create', 'wo.assign', 'wo.complete',
      'so.view', 'so.create',
      'inventory.view', 'inventory.procure',
      'warranty.view',
      'quote.view', 'quote.create',
      'invoice.view', 'invoice.create',
      'finance.view',
      'admin.config', 'audit.read',
      'documents.view', 'customers.view', 'technicians.view', 'equipment.view',
      'contracts.view',
      'attachment.upload',
    ],
    ops_manager: [
      'ticket.read', 'ticket.create', 'ticket.update', 'ticket.assign',
      'wo.read', 'wo.assign',
      'so.view',
      'inventory.view', 'inventory.procure',
      'warranty.view',
      'audit.read',
      'customers.view', 'technicians.view', 'equipment.view',
      'attachment.upload',
    ],
    dispatcher: [
      'ticket.read', 'ticket.create', 'ticket.update',
      'wo.read', 'wo.assign',
      'so.view',
      'attachment.upload',
    ],
    technician: [
      'ticket.read',
      'wo.read',
      'so.view',
      'attachment.upload',
    ],
    finance_manager: [
      'quote.view', 'quote.create',
      'invoice.view', 'invoice.create', 'invoice.pay',
      'finance.view', 'finance.create',
      'penalty.calculate',
      'audit.read',
      'contracts.view',
    ],
    fraud_investigator: [
      'fraud.view', 'fraud.create',
      'audit.read',
    ],
    auditor: [
      'fraud.view',
      'audit.read',
    ],
    support_agent: [
      'ticket.read', 'ticket.create', 'ticket.update',
      'warranty.view',
    ],
    partner_admin: [
      'wo.read',
      'inventory.view',
      'equipment.view',
    ],
  };

  roles.forEach(role => {
    const rolePerms = rolePermissionMap[role] || [];
    rolePerms.forEach(perm => permissions.add(perm));
  });

  return Array.from(permissions);
}

export const authRouter = router({
  register: publicProcedure
    .input(
      z.object({
        email: z.string().email("Invalid email format").max(255),
        password: z.string().min(8, "Password must be at least 8 characters").max(128),
        fullName: z.string().min(1, "Full name is required").max(255).trim(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { email, password, fullName } = input;

      // Check if user already exists
      const [existingUser] = await ctx.db
        .select()
        .from(usersTable)
        .where(eq(usersTable.email, email))
        .limit(1);

      if (existingUser) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "User already exists",
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      const userId = randomUUID();
      const tenantId = randomUUID(); // default org / tenant ID

      // Create user
      await ctx.db.insert(usersTable).values({
        id: userId,
        email,
        passwordHash: hashedPassword,
        fullName,
        active: true,
        tenantId,
        createdAt: new Date(),
      });

      // Create profile
      await ctx.db.insert(profilesTable).values({
        id: userId,
        email,
        fullName,
        tenantId,
        role: "user",
        createdAt: new Date(),
      });

      // Determine default role
      const userCountRes = await ctx.db
        .select({ count: sql<number>`count(*)` })
        .from(usersTable);
      const userCount = Number(userCountRes[0]?.count || 0);
      const defaultRole = userCount <= 1 ? "admin" : "technician";

      await ctx.db.insert(userRolesTable).values({
        id: randomUUID(),
        userId,
        role: defaultRole,
        tenantId,
        createdAt: new Date(),
      });

      const token = generateToken(userId);
      const { refreshToken, expiresAt: refreshExpiresAt } = await createRefreshToken(userId, ctx.db);

      return {
        user: {
          id: userId,
          email,
          fullName,
        },
        session: {
          access_token: token,
          refresh_token: refreshToken,
          expires_at: Date.now() + TOKEN_EXPIRY_MS,
          refresh_expires_at: refreshExpiresAt.getTime(),
        },
      };
    }),

  login: publicProcedure
    .input(
      z.object({
        email: z.string().email("Invalid email").max(255),
        password: z.string().min(1, "Password is required"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { email, password } = input;

      const [user] = await ctx.db
        .select()
        .from(usersTable)
        .where(eq(usersTable.email, email))
        .limit(1);

      if (!user || !user.active) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid credentials",
        });
      }

      const validPassword = await bcrypt.compare(password, user.passwordHash);
      if (!validPassword) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid credentials",
        });
      }

      const userRoles = await ctx.db
        .select()
        .from(userRolesTable)
        .where(eq(userRolesTable.userId, user.id));

      const token = generateToken(user.id);
      const { refreshToken, expiresAt: refreshExpiresAt } = await createRefreshToken(user.id, ctx.db);

      // Audit log
      try {
        await ctx.db.insert(authAuditLogsTable).values({
          id: randomUUID(),
          tenantId: user.tenantId,
          userId: user.id,
          email: user.email,
          event: "signin",
          ipAddress: ctx.req.ip || null,
          userAgent: ctx.req.headers["user-agent"] || null,
          createdAt: new Date(),
        });
      } catch (err) {
        // ignore
      }

      return {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
        },
        session: {
          access_token: token,
          refresh_token: refreshToken,
          expires_at: Date.now() + TOKEN_EXPIRY_MS,
          refresh_expires_at: refreshExpiresAt.getTime(),
        },
      };
    }),

  me: protectedProcedure.query(async ({ ctx }) => {
    const user = ctx.user;

    const userRoles = await ctx.db
      .select()
      .from(userRolesTable)
      .where(eq(userRolesTable.userId, user.id));

    const roleMap: Record<string, string> = {
      admin: "sys_admin",
      manager: "tenant_admin",
      technician: "technician",
      customer: "customer",
    };

    const mappedRoles = userRoles.map((ur) => {
      const mappedRole = roleMap[ur.role] || ur.role;
      return {
        id: ur.id,
        role: mappedRole,
        tenant_id: ur.tenantId,
        granted_at: ur.createdAt,
      };
    });

    const roles = mappedRoles.map((ur) => ur.role);
    const permissions = generatePermissionsFromRoles(roles);

    return {
      user: {
        id: user.id,
        email: user.email,
        full_name: user.fullName,
      },
      roles: mappedRoles,
      permissions,
      tenant_id: user.tenantId || null,
    };
  }),
});
