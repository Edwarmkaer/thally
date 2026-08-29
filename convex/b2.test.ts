import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/!(*.*.*)*.*s");

function setup() {
  return convexTest(schema, modules);
}

describe("B2 Convex functions", () => {
  test("A: createSession inserts required fields and returns a valid id", async () => {
    const t = setup();

    const sessionId = await t.mutation(api.sessions.createSession, {
      title: "  Debate presidencial  ",
    });

    expect(typeof sessionId).toBe("string");
    expect(sessionId.length).toBeGreaterThan(0);

    const session = await t.run(async (ctx) => ctx.db.get(sessionId));
    expect(session).toMatchObject({
      title: "Debate presidencial",
      status: "active",
    });
    expect(session?._id).toEqual(sessionId);
  });

  test("B: appendTranscript + listBySession order, ownership, and empty session", async () => {
    const t = setup();

    const sessionA = await t.mutation(api.sessions.createSession, {
      title: "Session A",
    });
    const sessionB = await t.mutation(api.sessions.createSession, {
      title: "Session B",
    });

    const empty = await t.query(api.transcripts.listBySession, {
      sessionId: sessionA,
    });
    expect(empty).toEqual([]);

    const later = await t.mutation(api.transcripts.appendTranscript, {
      sessionId: sessionA,
      text: "segundo fragmento",
      startTime: 20,
      endTime: 30,
    });
    const earlier = await t.mutation(api.transcripts.appendTranscript, {
      sessionId: sessionA,
      text: "primer fragmento",
      startTime: 0,
      endTime: 10,
    });
    await t.mutation(api.transcripts.appendTranscript, {
      sessionId: sessionB,
      text: "transcript de otra session",
      startTime: 5,
    });

    const listed = await t.query(api.transcripts.listBySession, {
      sessionId: sessionA,
    });

    expect(listed).toHaveLength(2);
    expect(listed.map((row) => row._id)).toEqual([earlier, later]);
    expect(listed.every((row) => row.sessionId === sessionA)).toBe(true);
    expect(listed.map((row) => row.text)).toEqual([
      "primer fragmento",
      "segundo fragmento",
    ]);
    expect(listed.some((row) => row.text.includes("otra session"))).toBe(false);
  });

  test("C: registerClaim, listBySession, completeClaim persist only verdict fields", async () => {
    const t = setup();

    const sessionA = await t.mutation(api.sessions.createSession, {
      title: "Session A",
    });
    const sessionB = await t.mutation(api.sessions.createSession, {
      title: "Session B",
    });
    const transcriptId = await t.mutation(api.transcripts.appendTranscript, {
      sessionId: sessionA,
      text: "Peru tiene mas de 50 millones de habitantes",
      startTime: 1,
      endTime: 4,
    });

    const claimId = await t.mutation(api.claims.registerClaim, {
      sessionId: sessionA,
      transcriptId,
      text: "  Peru tiene mas de 50 millones de habitantes.  ",
      timestamp: 2,
    });
    const earlierClaimId = await t.mutation(api.claims.registerClaim, {
      sessionId: sessionA,
      text: "Claim anterior en el tiempo",
      timestamp: 1,
    });

    const before = await t.query(api.claims.listBySession, {
      sessionId: sessionA,
    });
    expect(before.map((row) => row._id)).toEqual([earlierClaimId, claimId]);
    expect(before[1]).toMatchObject({
      _id: claimId,
      sessionId: sessionA,
      transcriptId,
      text: "Peru tiene mas de 50 millones de habitantes.",
      timestamp: 2,
      status: "searching",
    });
    expect(before[1].verdict).toBeUndefined();
    expect(before[1].explanation).toBeUndefined();

    const otherSessionClaims = await t.query(api.claims.listBySession, {
      sessionId: sessionB,
    });
    expect(otherSessionClaims).toEqual([]);

    await t.mutation(api.claims.completeClaim, {
      claimId,
      verdict: "disputed",
      explanation: "La poblacion de Peru es menor a 50 millones.",
    });

    const after = await t.query(api.claims.listBySession, {
      sessionId: sessionA,
    });
    expect(after).toHaveLength(2);
    expect(after.map((row) => row._id)).toEqual([earlierClaimId, claimId]);
    expect(after[0]).toMatchObject({
      _id: earlierClaimId,
      status: "searching",
    });
    expect(after[1]).toMatchObject({
      _id: claimId,
      sessionId: sessionA,
      transcriptId,
      text: "Peru tiene mas de 50 millones de habitantes.",
      timestamp: 2,
      status: "completed",
      verdict: "disputed",
      explanation: "La poblacion de Peru es menor a 50 millones.",
    });

    const persisted = await t.run(async (ctx) => ctx.db.get(claimId));
    expect(persisted).toMatchObject({
      status: "completed",
      verdict: "disputed",
      explanation: "La poblacion de Peru es menor a 50 millones.",
      sessionId: sessionA,
      transcriptId,
      text: "Peru tiene mas de 50 millones de habitantes.",
      timestamp: 2,
    });
  });

  test("D: addEvidence + listByClaim isolate by claim and empty collection", async () => {
    const t = setup();

    const sessionId = await t.mutation(api.sessions.createSession, {
      title: "Session A",
    });
    const claimA = await t.mutation(api.claims.registerClaim, {
      sessionId,
      text: "Claim A",
      timestamp: 1,
    });
    const claimB = await t.mutation(api.claims.registerClaim, {
      sessionId,
      text: "Claim B",
      timestamp: 2,
    });

    expect(
      await t.query(api.evidence.listByClaim, { claimId: claimA }),
    ).toEqual([]);

    const evidence1 = await t.mutation(api.evidence.addEvidence, {
      claimId: claimA,
      title: "Fuente 1",
      url: "https://example.com/1",
      source: "INEI",
      excerpt: "Censo 2017",
      stance: "contradicts",
    });
    const evidence2 = await t.mutation(api.evidence.addEvidence, {
      claimId: claimA,
      title: "Fuente 2",
      url: "https://example.com/2",
      source: "Banco Mundial",
      stance: "contradicts",
    });
    await t.mutation(api.evidence.addEvidence, {
      claimId: claimB,
      title: "Fuente de otro claim",
      url: "https://example.com/other",
      source: "Otro",
    });

    const listed = await t.query(api.evidence.listByClaim, { claimId: claimA });
    expect(listed).toHaveLength(2);
    expect(listed.map((row) => row._id).sort()).toEqual(
      [evidence1, evidence2].sort(),
    );
    expect(listed.every((row) => row.claimId === claimA)).toBe(true);
    expect(listed.some((row) => row.title.includes("otro claim"))).toBe(false);

    const claimADoc = await t.run(async (ctx) => ctx.db.get(claimA));
    expect(claimADoc?.sessionId).toEqual(sessionId);
    for (const row of listed) {
      const claim = await t.run(async (ctx) => ctx.db.get(row.claimId));
      expect(claim?.sessionId).toEqual(sessionId);
    }
  });

  test("E: sessions are isolated across transcripts, claims, and evidence", async () => {
    const t = setup();

    const sessionA = await t.mutation(api.sessions.createSession, {
      title: "Session A",
    });
    const sessionB = await t.mutation(api.sessions.createSession, {
      title: "Session B",
    });

    await t.mutation(api.transcripts.appendTranscript, {
      sessionId: sessionA,
      text: "transcript A",
      startTime: 0,
    });
    await t.mutation(api.transcripts.appendTranscript, {
      sessionId: sessionB,
      text: "transcript B",
      startTime: 0,
    });

    const claimA = await t.mutation(api.claims.registerClaim, {
      sessionId: sessionA,
      text: "claim A",
      timestamp: 1,
    });
    const claimB = await t.mutation(api.claims.registerClaim, {
      sessionId: sessionB,
      text: "claim B",
      timestamp: 1,
    });

    await t.mutation(api.evidence.addEvidence, {
      claimId: claimA,
      title: "evidence A",
      url: "https://a.example",
      source: "source A",
    });
    await t.mutation(api.evidence.addEvidence, {
      claimId: claimB,
      title: "evidence B",
      url: "https://b.example",
      source: "source B",
    });

    const transcriptsA = await t.query(api.transcripts.listBySession, {
      sessionId: sessionA,
    });
    const transcriptsB = await t.query(api.transcripts.listBySession, {
      sessionId: sessionB,
    });
    const claimsA = await t.query(api.claims.listBySession, {
      sessionId: sessionA,
    });
    const claimsB = await t.query(api.claims.listBySession, {
      sessionId: sessionB,
    });
    const evidenceA = await t.query(api.evidence.listByClaim, {
      claimId: claimA,
    });
    const evidenceB = await t.query(api.evidence.listByClaim, {
      claimId: claimB,
    });

    expect(transcriptsA.map((row) => row.text)).toEqual(["transcript A"]);
    expect(transcriptsB.map((row) => row.text)).toEqual(["transcript B"]);
    expect(claimsA.map((row) => row.text)).toEqual(["claim A"]);
    expect(claimsB.map((row) => row.text)).toEqual(["claim B"]);
    expect(evidenceA.map((row) => row.title)).toEqual(["evidence A"]);
    expect(evidenceB.map((row) => row.title)).toEqual(["evidence B"]);
  });

  test("F: full pipeline createSession -> transcript -> claim -> evidence -> completeClaim", async () => {
    const t = setup();

    const sessionId = await t.mutation(api.sessions.createSession, {
      title: "Pipeline",
    });
    const transcriptId = await t.mutation(api.transcripts.appendTranscript, {
      sessionId,
      text: "El sol es una estrella",
      startTime: 0,
      endTime: 3,
    });
    expect(
      await t.query(api.transcripts.listBySession, { sessionId }),
    ).toHaveLength(1);

    const claimId = await t.mutation(api.claims.registerClaim, {
      sessionId,
      transcriptId,
      text: "El sol es una estrella",
      timestamp: 1,
    });
    expect(await t.query(api.claims.listBySession, { sessionId })).toHaveLength(
      1,
    );

    await t.mutation(api.evidence.addEvidence, {
      claimId,
      title: "NASA",
      url: "https://nasa.gov",
      source: "NASA",
      stance: "supports",
    });
    expect(await t.query(api.evidence.listByClaim, { claimId })).toHaveLength(1);

    await t.mutation(api.claims.completeClaim, {
      claimId,
      verdict: "supported",
      explanation: "Consistente con astronomia.",
    });

    const [claim] = await t.query(api.claims.listBySession, { sessionId });
    expect(claim.status).toBe("completed");
    expect(claim.verdict).toBe("supported");
  });

  test("F: current validators reject empty/invalid args; missing docs follow existing guarantees", async () => {
    const t = setup();
    const sessionId = await t.mutation(api.sessions.createSession, {
      title: "Valid",
    });
    const claimId = await t.mutation(api.claims.registerClaim, {
      sessionId,
      text: "claim",
      timestamp: 0,
    });

    await expect(
      t.mutation(api.sessions.createSession, { title: "   " }),
    ).rejects.toThrow("title cannot be empty");

    await expect(
      t.mutation(api.transcripts.appendTranscript, {
        sessionId,
        text: "   ",
        startTime: 0,
      }),
    ).rejects.toThrow("text cannot be empty");

    await expect(
      t.mutation(api.transcripts.appendTranscript, {
        sessionId,
        text: "ok",
        startTime: -1,
      }),
    ).rejects.toThrow("startTime cannot be negative");

    await expect(
      t.mutation(api.transcripts.appendTranscript, {
        sessionId,
        text: "ok",
        startTime: 10,
        endTime: 9,
      }),
    ).rejects.toThrow("endTime must be greater than or equal to startTime");

    await expect(
      t.mutation(api.claims.registerClaim, {
        sessionId,
        text: " ",
        timestamp: 0,
      }),
    ).rejects.toThrow("text cannot be empty");

    await expect(
      t.mutation(api.claims.registerClaim, {
        sessionId,
        text: "ok",
        timestamp: -5,
      }),
    ).rejects.toThrow("timestamp cannot be negative");

    await expect(
      t.mutation(api.evidence.addEvidence, {
        claimId,
        title: " ",
        url: "https://x",
        source: "s",
      }),
    ).rejects.toThrow("title cannot be empty");

    await expect(
      t.mutation(api.claims.completeClaim, {
        claimId,
        // @ts-expect-error invalid verdict is rejected by schema validators
        verdict: "true",
        explanation: "no",
      }),
    ).rejects.toThrow();

    await expect(
      t.mutation(api.sessions.createSession, {
        // @ts-expect-error title is required
      }),
    ).rejects.toThrow();

    const deletedClaim = await t.mutation(api.claims.registerClaim, {
      sessionId,
      text: "to delete",
      timestamp: 3,
    });
    await t.run(async (ctx) => {
      await ctx.db.delete(deletedClaim);
    });
    await expect(
      t.mutation(api.claims.completeClaim, {
        claimId: deletedClaim,
        verdict: "supported",
        explanation: "gone",
      }),
    ).rejects.toThrow("claim not found");

    const deletedSession = await t.mutation(api.sessions.createSession, {
      title: "gone",
    });
    await t.run(async (ctx) => {
      await ctx.db.delete(deletedSession);
    });
    const emptyTranscripts = await t.query(api.transcripts.listBySession, {
      sessionId: deletedSession,
    });
    expect(emptyTranscripts).toEqual([]);
    const emptyClaims = await t.query(api.claims.listBySession, {
      sessionId: deletedSession,
    });
    expect(emptyClaims).toEqual([]);
  });
});
