import { httpRouter } from "convex/server";
import { api } from "./_generated/api";
import { httpAction } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

const http = httpRouter();

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function unauthorized(): Response {
  return jsonResponse({ error: "unauthorized" }, 401);
}

function invalidPayload(): Response {
  return jsonResponse({ error: "invalid payload" }, 400);
}

function internalError(): Response {
  return jsonResponse({ error: "internal error" }, 500);
}

function authorize(request: Request): Response | null {
  const expected = process.env.AGENT_WEBHOOK_SECRET;
  if (expected === undefined || expected === "") {
    return internalError();
  }

  const header = request.headers.get("Authorization");
  if (header === null) {
    return unauthorized();
  }

  const prefix = "Bearer ";
  if (!header.startsWith(prefix)) {
    return unauthorized();
  }

  const token = header.slice(prefix.length);
  if (token !== expected) {
    return unauthorized();
  }

  return null;
}

async function readJsonObject(
  request: Request,
): Promise<Record<string, unknown> | Response> {
  let parsed: unknown;
  try {
    parsed = await request.json();
  } catch {
    return invalidPayload();
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return invalidPayload();
  }

  return parsed as Record<string, unknown>;
}

function isClientMutationError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("ArgumentValidationError") ||
    message.includes("Validator error") ||
    message.includes("cannot be empty") ||
    message.includes("cannot be negative") ||
    message.includes("claim not found")
  );
}

http.route({
  path: "/agent/register-claim",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const authError = authorize(request);
    if (authError !== null) {
      return authError;
    }

    const body = await readJsonObject(request);
    if (body instanceof Response) {
      return body;
    }

    const sessionId = body.sessionId;
    const text = body.text;
    const timestamp = body.timestamp;
    const transcriptId = body.transcriptId;

    if (typeof sessionId !== "string" || sessionId === "") {
      return invalidPayload();
    }
    if (typeof text !== "string") {
      return invalidPayload();
    }
    if (typeof timestamp !== "number" || !Number.isFinite(timestamp)) {
      return invalidPayload();
    }
    if (transcriptId !== undefined && typeof transcriptId !== "string") {
      return invalidPayload();
    }

    try {
      const claimId = await ctx.runMutation(api.claims.registerClaim, {
        sessionId: sessionId as Id<"sessions">,
        text,
        timestamp,
        ...(transcriptId === undefined
          ? {}
          : { transcriptId: transcriptId as Id<"transcripts"> }),
      });

      return jsonResponse({ ok: true, claimId }, 200);
    } catch (error) {
      if (isClientMutationError(error)) {
        return invalidPayload();
      }
      return internalError();
    }
  }),
});

http.route({
  path: "/agent/complete-claim",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const authError = authorize(request);
    if (authError !== null) {
      return authError;
    }

    const body = await readJsonObject(request);
    if (body instanceof Response) {
      return body;
    }

    const claimId = body.claimId;
    const verdict = body.verdict;
    const explanation = body.explanation;

    if (typeof claimId !== "string" || claimId === "") {
      return invalidPayload();
    }
    if (
      verdict !== "supported" &&
      verdict !== "disputed" &&
      verdict !== "insufficient_evidence"
    ) {
      return invalidPayload();
    }
    if (typeof explanation !== "string") {
      return invalidPayload();
    }

    try {
      await ctx.runMutation(api.claims.completeClaim, {
        claimId: claimId as Id<"claims">,
        verdict,
        explanation,
      });

      return jsonResponse({ ok: true }, 200);
    } catch (error) {
      if (isClientMutationError(error)) {
        return invalidPayload();
      }
      return internalError();
    }
  }),
});

export default http;
