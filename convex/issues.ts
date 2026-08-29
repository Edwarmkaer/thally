import { v } from "convex/values";
import { action, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";

// Crear una issue es un POST autenticado: no hace falta MCP ni un SDK. El servidor MCP de
// GitHub existe para clientes MCP (Claude Code, Cursor), no para un backend que ya sabe
// qué endpoint llamar.
const GITHUB_API_VERSION = "2026-03-10";

export const claimForIssue = internalQuery({
  args: { claimId: v.id("claims") },
  handler: (ctx, args) => ctx.db.get(args.claimId),
});

export const attachIssue = internalMutation({
  args: { claimId: v.id("claims"), issueUrl: v.string() },
  handler: (ctx, args) =>
    ctx.db.patch(args.claimId, { issueUrl: args.issueUrl }),
});

/**
 * Cierra el cuerpo con la trazabilidad a la afirmación: sin esto la issue no se puede
 * auditar contra la sesión de la que salió.
 */
export function issueBody(body: string, claim: Doc<"claims">): string {
  const lines = [body.trim(), "", "---", `Afirmación: ${claim.text}`];
  if (claim.quote !== undefined) {
    lines.push(`> ${claim.quote}`);
  }
  if (claim.support !== undefined) {
    lines.push(`Verificación: ${claim.support}`);
  }
  lines.push(
    `Sesión \`${claim.sessionId}\` · ${Math.round(claim.atMs / 1000)}s`,
  );
  return lines.join("\n");
}

/**
 * Abre una issue en GitHub a partir de una afirmación. Quién decide que la afirmación
 * merece una issue —y con qué texto— es el agente; acá solo se ejecuta y se deja registro.
 */
export const createForClaim = action({
  args: {
    claimId: v.id("claims"),
    title: v.string(),
    body: v.string(),
    labels: v.optional(v.array(v.string())),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ url: string; number?: number; created: boolean }> => {
    const title = args.title.trim();
    if (title === "") {
      throw new Error("title cannot be empty");
    }

    const claim = await ctx.runQuery(internal.issues.claimForIssue, {
      claimId: args.claimId,
    });
    if (claim === null) {
      throw new Error("claim not found");
    }

    // Una afirmación no genera dos issues aunque el agente reintente.
    // ponytail: chequeo optimista; dos llamadas simultáneas sobre el mismo claim podrían
    // duplicar. Si llega a pasar, reservar el claim en una mutation antes del fetch.
    if (claim.issueUrl !== undefined) {
      console.log(`[issues] ya existe claim=${args.claimId} ${claim.issueUrl}`);
      return { url: claim.issueUrl, created: false };
    }

    const repo = process.env.GITHUB_REPO;
    const token = process.env.GITHUB_TOKEN;
    if (
      repo === undefined ||
      repo === "" ||
      token === undefined ||
      token === ""
    ) {
      throw new Error("GITHUB_REPO / GITHUB_TOKEN sin configurar");
    }

    const response = await fetch(
      `https://api.github.com/repos/${repo}/issues`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": GITHUB_API_VERSION,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          body: issueBody(args.body, claim),
          labels: args.labels ?? ["thally"],
        }),
      },
    );

    if (!response.ok) {
      // El cuerpo del error de GitHub dice qué falta (token, permiso, label); sin él el
      // 500 no se puede diagnosticar.
      console.error(
        `[issues] github ${response.status} claim=${args.claimId} ${await response.text()}`,
      );
      throw new Error(`github responded ${response.status}`);
    }

    const issue = (await response.json()) as {
      html_url: string;
      number: number;
    };
    await ctx.runMutation(internal.issues.attachIssue, {
      claimId: args.claimId,
      issueUrl: issue.html_url,
    });
    console.log(
      `[issues] creada claim=${args.claimId} #${issue.number} ${issue.html_url}`,
    );

    return { url: issue.html_url, number: issue.number, created: true };
  },
});
