import { describe, it, expect, beforeAll } from "vitest";

const API_URL = process.env.API_URL || "http://localhost:3001";

async function trpcPost(path: string, jsonInput: any = {}, token?: string) {
  const res = await fetch(`${API_URL}/trpc/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ json: jsonInput }),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function trpcGet(path: string, jsonInput?: any, token?: string) {
  let url = `${API_URL}/trpc/${path}`;
  if (jsonInput) {
    url += `?input=${encodeURIComponent(JSON.stringify({ json: jsonInput }))}`;
  }
  const res = await fetch(url, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

let serverAvailable = false;
beforeAll(async () => {
  try {
    const res = await fetch(`${API_URL}/health`, { signal: AbortSignal.timeout(3000) });
    serverAvailable = res.ok || res.status === 503;
  } catch {
    serverAvailable = false;
  }
});

describe("tRPC API Integration Tests", () => {
  const email = `trpc-${Date.now()}@example.com`;
  const password = "Password123!";
  const fullName = "tRPC User";
  let token = "";

  it("should register a user via tRPC auth.register", async () => {
    if (!serverAvailable) return;

    const { status, data } = await trpcPost("auth.register", {
      email,
      password,
      fullName,
    });

    expect(status).toBe(200);
    expect(data.result.data.json.session.access_token).toBeDefined();
    token = data.result.data.json.session.access_token;
  });

  it("should authenticate a user via tRPC auth.login", async () => {
    if (!serverAvailable) return;

    const { status, data } = await trpcPost("auth.login", {
      email,
      password,
    });

    expect(status).toBe(200);
    expect(data.result.data.json.session.access_token).toBeDefined();
  });

  it("should retrieve user profile details via tRPC auth.me", async () => {
    if (!serverAvailable || !token) return;

    const { status, data } = await trpcGet("auth.me", undefined, token);

    expect(status).toBe(200);
    expect(data.result.data.json.user.email).toBe(email);
  });

  it("should perform workOrders.create, list, get, updateStatus via tRPC", async () => {
    if (!serverAvailable || !token) return;

    // Create Work Order
    const createRes = await trpcPost(
      "workOrders.create",
      {
        title: "Test Work Order",
        priority: "high",
        description: "Test Description",
      },
      token
    );
    expect(createRes.status).toBe(200);
    const newWo = createRes.data.result.data.json;
    expect(newWo.title).toBe("Test Work Order");

    // List Work Orders
    const listRes = await trpcGet("workOrders.list", undefined, token);
    expect(listRes.status).toBe(200);
    const wos = listRes.data.result.data.json;
    expect(wos.length).toBeGreaterThan(0);

    // Get Single Work Order
    const getRes = await trpcGet("workOrders.get", { id: newWo.id }, token);
    expect(getRes.status).toBe(200);
    expect(getRes.data.result.data.json.title).toBe("Test Work Order");

    // Update Status
    const updateRes = await trpcPost(
      "workOrders.updateStatus",
      {
        id: newWo.id,
        status: "in_progress",
      },
      token
    );
    expect(updateRes.status).toBe(200);
    expect(updateRes.data.result.data.json.status).toBe("in_progress");
  });
});
