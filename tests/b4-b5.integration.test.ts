import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeAll, describe, expect, test } from "vitest";
import { ConvexClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

type ClaimRow = {
  _id: Id<"claims">;
  status: string;
  support?: "supported" | "disputed" | "unsupported";
  text: string;
};

function loadDotEnvLocal() {
  const contents = readFileSync(resolve(root, ".env.local"), "utf8");
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === "" || line.startsWith("#")) {
      continue;
    }
    const eq = line.indexOf("=");
    if (eq <= 0) {
      continue;
    }
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    const comment = value.indexOf(" #");
    if (comment >= 0) {
      value = value.slice(0, comment).trim();
    }
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function convexEnv(name: "CONVEX_URL" | "CONVEX_SITE_URL"): string {
  const value = process.env[name];
  if (value === undefined || value === "") {
    throw new Error(`${name} is missing`);
  }
  return value.replace(/\/$/, "");
}

function loadWebhookSecret(): string {
  const fromEnv = process.env.AGENT_WEBHOOK_SECRET;
  if (fromEnv !== undefined && fromEnv !== "") {
    return fromEnv;
  }

  const convexBin = resolve(root, "node_modules", "convex", "bin", "main.js");
  const stdout = execFileSync(process.execPath, [convexBin, "env", "get", "AGENT_WEBHOOK_SECRET"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const value = stdout.trim();
  if (value === "") {
    throw new Error("AGENT_WEBHOOK_SECRET is not configured");
  }
  return value;
}

function subscribeClaims(client: ConvexClient, sessionId: Id<"sessions">) {
  const snapshots: ClaimRow[][] = [];
  const listeners = new Set<(claims: ClaimRow[]) => void>();

  const unsubscribe = client.onUpdate(
    api.claims.listBySession,
    { sessionId },
    (claims) => {
      snapshots.push(claims);
      for (const listener of [...listeners]) {
        listener(claims);
      }
    },
  );

  function waitUntil(
    predicate: (claims: ClaimRow[]) => boolean,
  ): Promise<ClaimRow[]> {
    return new Promise((resolvePromise, rejectPromise) => {
      const timer = setTimeout(() => {
        listeners.delete(listener);
        rejectPromise(
          new Error("subscription did not receive the expected update"),
        );
      }, 20000);

      const listener = (claims: ClaimRow[]) => {
        if (!predicate(claims)) {
          return;
        }
        clearTimeout(timer);
        listeners.delete(listener);
        resolvePromise(claims);
      };

      listeners.add(listener);
      const latest = snapshots.at(-1);
      if (latest !== undefined) {
        listener(latest);
      }
    });
  }

  return {
    waitUntil,
    unsubscribe: () => unsubscribe(),
    snapshots,
  };
}

async function postAgent(
  path: "/agent/register-claim" | "/agent/complete-claim",
  body: unknown,
  authorization?: string,
): Promise<{ status: number; json: unknown }> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (authorization !== undefined) {
    headers.Authorization = authorization;
  }

  const response = await fetch(`${convexEnv("CONVEX_SITE_URL")}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  let json: unknown = null;
  const text = await response.text();
  if (text !== "") {
    json = JSON.parse(text);
  }
  return { status: response.status, json };
}

describe("B4 realtime + B5 HTTP", () => {
  let webhookSecret: string;
  const clients: ConvexClient[] = [];

  beforeAll(() => {
    loadDotEnvLocal();
    webhookSecret = loadWebhookSecret();
  });

  afterEach(async () => {
    while (clients.length > 0) {
      const client = clients.pop();
      await client?.close();
    }
  });

  function connect(): ConvexClient {
    const client = new ConvexClient(convexEnv("CONVEX_URL"), {
      unsavedChangesWarning: false,
    });
    clients.push(client);
    return client;
  }

  test("B4: the same listBySession subscription receives searching then completed", async () => {
    const client = connect();
    const sessionId = await client.mutation(api.sessions.createSession, {
      title: "B4 realtime",
    });
    const claimId = await client.mutation(api.claims.registerClaim, {
      sessionId,
      text: "El sol es una estrella",
      atMs: 1,
    });

    const feed = subscribeClaims(client, sessionId);
    const searchingClaims = await feed.waitUntil((claims) =>
      claims.some(
        (claim) => claim._id === claimId && claim.status === "searching",
      ),
    );
    expect(
      searchingClaims.find((claim) => claim._id === claimId),
    ).toMatchObject({
      status: "searching",
    });
    const snapshotsAfterSearching = feed.snapshots.length;

    await client.mutation(api.claims.completeClaim, {
      claimId,
      support: "disputed",
      explanation: "No corresponde al claim de prueba.",
    });

    const completedClaims = await feed.waitUntil((claims) =>
      claims.some(
        (claim) =>
          claim._id === claimId &&
          claim.status === "checked" &&
          claim.support === "disputed",
      ),
    );
    const updated = completedClaims.find((claim) => claim._id === claimId);
    expect(updated).toMatchObject({
      status: "checked",
      support: "disputed",
    });
    expect(feed.snapshots.length).toBeGreaterThan(snapshotsAfterSearching);
    feed.unsubscribe();
  });

  test("B5 HTTP 1: register-claim without Authorization returns 401", async () => {
    const result = await postAgent("/agent/register-claim", {
      sessionId: "skip",
      text: "x",
      atMs: 0,
    });
    expect(result.status).toBe(401);
  });

  test("B5 HTTP 2: register-claim with wrong Bearer token returns 401", async () => {
    const result = await postAgent(
      "/agent/register-claim",
      { sessionId: "skip", text: "x", atMs: 0 },
      "Bearer definitely-not-the-webhook-secret",
    );
    expect(result.status).toBe(401);
  });

  test("B5 HTTP 3: valid auth and invalid body returns 400", async () => {
    const result = await postAgent(
      "/agent/register-claim",
      { text: "missing session and atMs" },
      `Bearer ${webhookSecret}`,
    );
    expect(result.status).toBe(400);
  });

  test("B5 HTTP 4+5: register-claim and complete-claim persist in Convex", async () => {
    const client = connect();
    const sessionId = await client.mutation(api.sessions.createSession, {
      title: "B5 http",
    });

    const registered = await postAgent(
      "/agent/register-claim",
      {
        sessionId,
        text: "Peru tiene mas de 50 millones de habitantes.",
        atMs: 2,
      },
      `Bearer ${webhookSecret}`,
    );

    expect(registered.status).toBe(200);
    expect(registered.json).toMatchObject({ ok: true });
    const claimId = (registered.json as { claimId: Id<"claims"> }).claimId;
    expect(typeof claimId).toBe("string");

    const stored = await client.query(api.claims.listBySession, { sessionId });
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({
      _id: claimId,
      status: "searching",
    });

    const completed = await postAgent(
      "/agent/complete-claim",
      {
        claimId,
        support: "disputed",
        explanation: "La poblacion es menor a 50 millones.",
      },
      `Bearer ${webhookSecret}`,
    );

    expect(completed.status).toBe(200);
    expect(completed.json).toEqual({ ok: true });

    const after = await client.query(api.claims.listBySession, { sessionId });
    expect(after[0]).toMatchObject({
      _id: claimId,
      status: "checked",
      support: "disputed",
    });
  });

  test("integration: HTTP register/complete push updates to one subscription", async () => {
    const client = connect();
    const sessionId = await client.mutation(api.sessions.createSession, {
      title: "B4+B5 http realtime",
    });

    const feed = subscribeClaims(client, sessionId);
    await feed.waitUntil((claims) => claims.length === 0);

    const registered = await postAgent(
      "/agent/register-claim",
      {
        sessionId,
        text: "El agua hierve a 100 C al nivel del mar.",
        atMs: 3,
      },
      `Bearer ${webhookSecret}`,
    );
    expect(registered.status).toBe(200);
    const claimId = (registered.json as { claimId: Id<"claims"> }).claimId;

    const searchingClaims = await feed.waitUntil((claims) =>
      claims.some(
        (claim) => claim._id === claimId && claim.status === "searching",
      ),
    );
    expect(
      searchingClaims.find((claim) => claim._id === claimId),
    ).toMatchObject({ status: "searching" });
    const snapshotsAfterSearching = feed.snapshots.length;

    const completeResult = await postAgent(
      "/agent/complete-claim",
      {
        claimId,
        support: "disputed",
        explanation: "Veredicto de prueba via HTTP.",
      },
      `Bearer ${webhookSecret}`,
    );
    expect(completeResult.status).toBe(200);

    const completedClaims = await feed.waitUntil((claims) =>
      claims.some(
        (claim) =>
          claim._id === claimId &&
          claim.status === "checked" &&
          claim.support === "disputed",
      ),
    );
    expect(
      completedClaims.find((claim) => claim._id === claimId),
    ).toMatchObject({
      status: "checked",
      support: "disputed",
    });
    expect(feed.snapshots.length).toBeGreaterThan(snapshotsAfterSearching);
    feed.unsubscribe();
  });
});
