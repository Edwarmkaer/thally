import { action, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

export const addEvidence = mutation({
  args: {
    claimId: v.id("claims"),
    title: v.string(),
    url: v.string(),
    source: v.string(),
    excerpt: v.optional(v.string()),
    stance: v.optional(
      v.union(
        v.literal("supports"),
        v.literal("contradicts"),
        v.literal("neutral"),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const title = args.title.trim();
    const url = args.url.trim();
    const source = args.source.trim();

    if (title === "") {
      throw new Error("title cannot be empty");
    }
    if (url === "") {
      throw new Error("url cannot be empty");
    }
    if (source === "") {
      throw new Error("source cannot be empty");
    }

    const evidenceId = await ctx.db.insert("evidence", {
      claimId: args.claimId,
      title,
      url,
      source,
      excerpt: args.excerpt,
      stance: args.stance,
    });

    return evidenceId;
  },
});

export const listByClaim = query({
  args: {
    claimId: v.id("claims"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("evidence")
      .withIndex("by_claimId", (q) => q.eq("claimId", args.claimId))
      .collect();
  },
});

// --- Búsqueda de evidencia con Apify ---

const APIFY_ENDPOINT =
  "https://api.apify.com/v2/acts/apify~rag-web-browser/run-sync-get-dataset-items";

type EvidenceRow = {
  title: string;
  url: string;
  source: string;
  excerpt?: string;
};

/**
 * Traduce lo que devuelve el actor a filas de `evidence`.
 * Exportada para poder probarla sin llamar a Apify.
 */
export function toEvidenceRows(items: unknown, limit: number): EvidenceRow[] {
  if (!Array.isArray(items)) {
    return [];
  }

  const rows: EvidenceRow[] = [];
  for (const item of items) {
    if (typeof item !== "object" || item === null) {
      continue;
    }
    const record = item as Record<string, unknown>;
    const metadata = (record.metadata ?? {}) as Record<string, unknown>;
    const searchResult = (record.searchResult ?? {}) as Record<string, unknown>;

    const url = metadata.url ?? searchResult.url;
    if (typeof url !== "string" || url === "") {
      continue;
    }

    const rawTitle = metadata.title ?? searchResult.title;
    const title =
      typeof rawTitle === "string" && rawTitle.trim() !== ""
        ? rawTitle.trim()
        : url;

    let source = url;
    try {
      source = new URL(url).hostname.replace(/^www\./, "");
    } catch {
      // ponytail: una URL que no parsea igual sirve como fuente; se guarda entera.
    }

    // ponytail: el actor devuelve páginas enteras (hasta 30k caracteres). Guardamos el
    // arranque, que es lo que se muestra junto a la afirmación; el resto no lo lee nadie.
    const markdown = record.markdown;
    const excerpt =
      typeof markdown === "string" && markdown.trim() !== ""
        ? markdown.trim().slice(0, 500)
        : undefined;

    rows.push({ title, url, source, excerpt });
    if (rows.length >= limit) {
      break;
    }
  }

  return rows;
}

/**
 * Busca evidencia para una afirmación y la deja adjunta.
 *
 * No se dispara sola al registrar una afirmación: cada corrida tarda ~17s y consume crédito
 * de Apify, así que quien orquesta decide cuándo llamarla.
 */
export const searchEvidence = action({
  args: {
    claimId: v.id("claims"),
    query: v.string(),
    maxResults: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<number> => {
    const token = process.env.APIFY_TOKEN;
    if (token === undefined || token === "") {
      throw new Error("APIFY_TOKEN is not set");
    }

    const query = args.query.trim();
    if (query === "") {
      throw new Error("query cannot be empty");
    }

    const maxResults = args.maxResults ?? 3;

    const response = await fetch(APIFY_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        query,
        maxResults,
        outputFormats: ["markdown"],
        scrapingTool: "raw-http",
      }),
    });

    if (!response.ok) {
      throw new Error(`apify search failed with status ${response.status}`);
    }

    const rows = toEvidenceRows(await response.json(), maxResults);

    for (const row of rows) {
      await ctx.runMutation(api.evidence.addEvidence, {
        claimId: args.claimId,
        title: row.title,
        url: row.url,
        source: row.source,
        excerpt: row.excerpt,
      });
    }

    return rows.length;
  },
});
