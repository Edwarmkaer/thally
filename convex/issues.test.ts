import { convexTest } from "convex-test";
import { afterEach, describe, expect, test, vi } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { issueBody } from "./issues";

const modules = import.meta.glob("./**/!(*.*.*)*.*s");

function githubOk() {
  return vi.fn(async () =>
    Response.json({ html_url: "https://github.com/o/r/issues/7", number: 7 }),
  );
}

async function claimEnUnaSesion(t: ReturnType<typeof convexTest>) {
  const sessionId = await t.mutation(api.sessions.createSession, {
    title: "Daily",
  });
  return await t.mutation(api.claims.registerClaim, {
    sessionId,
    text: "El login se cae en Safari",
    quote: "oye, el login se cae en Safari",
    atMs: 90_000,
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("createForClaim", () => {
  test("crea la issue una sola vez y la deja anotada en la afirmación", async () => {
    vi.stubEnv("GITHUB_REPO", "o/r");
    vi.stubEnv("GITHUB_TOKEN", "t");
    const fetchMock = githubOk();
    vi.stubGlobal("fetch", fetchMock);

    const t = convexTest(schema, modules);
    const claimId = await claimEnUnaSesion(t);

    const first = await t.action(api.issues.createForClaim, {
      claimId,
      title: "Login roto en Safari",
      body: "Reportado en la daily.",
    });
    expect(first).toMatchObject({
      url: "https://github.com/o/r/issues/7",
      created: true,
    });

    // El reintento del agente no abre una segunda issue.
    const retry = await t.action(api.issues.createForClaim, {
      claimId,
      title: "Login roto en Safari",
      body: "Reportado en la daily.",
    });
    expect(retry).toEqual({
      url: "https://github.com/o/r/issues/7",
      created: false,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const claim = await t.run(async (ctx) => ctx.db.get(claimId));
    expect(claim?.issueUrl).toBe("https://github.com/o/r/issues/7");
  });

  test("un error de GitHub no marca la afirmación como ya reportada", async () => {
    vi.stubEnv("GITHUB_REPO", "o/r");
    vi.stubEnv("GITHUB_TOKEN", "malo");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ message: "Bad credentials" }, { status: 401 })),
    );

    const t = convexTest(schema, modules);
    const claimId = await claimEnUnaSesion(t);

    await expect(
      t.action(api.issues.createForClaim, { claimId, title: "x", body: "" }),
    ).rejects.toThrow("github responded 401");

    const claim = await t.run(async (ctx) => ctx.db.get(claimId));
    expect(claim?.issueUrl).toBeUndefined();
  });
});

describe("issueBody", () => {
  test("adjunta la afirmación, la cita y el momento de la sesión", () => {
    const body = issueBody("Reportado en la daily.", {
      _id: "c1",
      _creationTime: 0,
      sessionId: "s1",
      text: "El login se cae en Safari",
      quote: "oye, el login se cae en Safari",
      atMs: 90_000,
      status: "checked",
      support: "disputed",
    } as never);

    expect(body).toContain("Reportado en la daily.");
    expect(body).toContain("Afirmación: El login se cae en Safari");
    expect(body).toContain("> oye, el login se cae en Safari");
    expect(body).toContain("Verificación: disputed");
    expect(body).toContain("· 90s");
  });
});
