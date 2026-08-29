import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/!(*.*.*)*.*s");

async function claimFixture() {
  const t = convexTest(schema, modules);
  const sessionId = await t.mutation(api.sessions.createSession, {
    title: "Sesión",
  });
  const claimId = await t.mutation(api.claims.registerClaim, {
    sessionId,
    text: "El Perú tiene más de 50 millones de habitantes.",
    atMs: 0,
  });
  return { t, claimId };
}

describe("attachEvidence", () => {
  test("guarda las fuentes en el orden recibido y deja la afirmación en analyzing", async () => {
    const { t, claimId } = await claimFixture();

    const count = await t.mutation(api.evidence.attachEvidence, {
      claimId,
      rows: [
        { title: "INEI", url: "https://gob.pe/a", source: "gob.pe" },
        { title: "Banco Mundial", url: "https://bm.org/b", source: "bm.org" },
      ],
    });

    expect(count).toBe(2);
    const rows = await t.query(api.evidence.listByClaim, { claimId });
    // El orden importa: el actor devuelve las fuentes por relevancia.
    expect(rows.map((row) => row.url)).toEqual([
      "https://gob.pe/a",
      "https://bm.org/b",
    ]);
    expect(await t.run(async (ctx) => ctx.db.get(claimId))).toMatchObject({
      status: "analyzing",
    });
  });

  test("sin fuentes la afirmación queda en needs_context", async () => {
    const { t, claimId } = await claimFixture();

    expect(
      await t.mutation(api.evidence.attachEvidence, { claimId, rows: [] }),
    ).toBe(0);
    expect(await t.query(api.evidence.listByClaim, { claimId })).toEqual([]);
    expect(await t.run(async (ctx) => ctx.db.get(claimId))).toMatchObject({
      status: "needs_context",
    });
  });
});
