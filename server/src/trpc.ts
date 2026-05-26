import { initTRPC, TRPCError } from "@trpc/server";
import { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import superjson from "superjson";
import jwt from "jsonwebtoken";
import { db } from "./db/client.js";
import { users as usersTable, userRoles as userRolesTable, profiles as profilesTable } from "./db/schema.js";
import { eq } from "drizzle-orm";
import dotenv from "dotenv";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, "../../.env") });

const JWT_SECRET = process.env.JWT_SECRET || "dev-only-secret-do-not-use-in-prod";

export interface UserPayload {
  id: string;
  email: string;
  fullName: string;
  roles: string[];
  tenantId?: string;
}

export const createContext = async ({ req, res }: CreateExpressContextOptions) => {
  let user: UserPayload | null = null;
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      if (decoded && decoded.userId) {
        // Fetch user from DB using Drizzle
        const [foundUser] = await db
          .select({
            id: usersTable.id,
            email: usersTable.email,
            fullName: usersTable.fullName,
            tenantId: usersTable.tenantId,
          })
          .from(usersTable)
          .where(eq(usersTable.id, decoded.userId))
          .limit(1);

        if (foundUser) {
          // Fetch roles
          const roles = await db
            .select({
              role: userRolesTable.role,
            })
            .from(userRolesTable)
            .where(eq(userRolesTable.userId, foundUser.id));

          // Fetch profile for tenantId if not on user
          let tenantId = foundUser.tenantId;
          if (!tenantId) {
            const [profile] = await db
              .select({
                tenantId: profilesTable.tenantId,
              })
              .from(profilesTable)
              .where(eq(profilesTable.id, foundUser.id))
              .limit(1);
            tenantId = profile?.tenantId || null;
          }

          user = {
            id: foundUser.id,
            email: foundUser.email,
            fullName: foundUser.fullName,
            roles: roles.map((r) => r.role),
            tenantId: tenantId || undefined,
          };
        }
      }
    } catch (e) {
      // Token verification failed, leave user as null
    }
  }

  return {
    req,
    res,
    db,
    user,
  };
};

export type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const router = t.router;
export const middleware = t.middleware;

// Public Procedure (no auth required)
export const publicProcedure = t.procedure;

// Protected Procedure (auth required)
const isAuthed = middleware(({ next, ctx }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
  }
  return next({
    ctx: {
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(isAuthed);

// Tenant Procedure (auth required, scopes query/context to tenantId)
const hasTenant = middleware(({ next, ctx }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
  }
  const tenantId = ctx.user.tenantId || "default"; // Fallback to "default" or enforce tenantId check
  return next({
    ctx: {
      user: ctx.user,
      tenantId,
    },
  });
});

export const tenantProcedure = protectedProcedure.use(hasTenant);
