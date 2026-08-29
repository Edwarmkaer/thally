import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { resolve } from "node:path";
import { config } from "dotenv";
import { startScribeRealtime } from "./scribe-realtime";

config({ path: resolve(process.cwd(), ".env.local"), quiet: true });

const PORT = Number(process.env.PORT ?? 3000);
const ROOT = process.cwd();
const INDEX = resolve(ROOT, "web", "index.html");
const VIDEO = resolve(ROOT, "video.mp4");

let active: AbortController | null = null;

function sendSse(
  res: ServerResponse,
  event: string,
  data: Record<string, unknown>,
): void {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

function serveIndex(res: ServerResponse): void {
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  createReadStream(INDEX).pipe(res);
}

function serveVideo(req: IncomingMessage, res: ServerResponse): void {
  if (!existsSync(VIDEO)) {
    res.writeHead(404);
    res.end("video.mp4 not found");
    return;
  }
  const { size } = statSync(VIDEO);
  const range = req.headers.range;
  if (range === undefined) {
    res.writeHead(200, {
      "Content-Type": "video/mp4",
      "Content-Length": size,
      "Accept-Ranges": "bytes",
    });
    createReadStream(VIDEO).pipe(res);
    return;
  }
  const match = /^bytes=(\d*)-(\d*)$/.exec(range);
  if (match === null) {
    res.writeHead(416);
    res.end();
    return;
  }
  const start = match[1] === "" ? 0 : Number(match[1]);
  const end = match[2] === "" ? size - 1 : Number(match[2]);
  res.writeHead(206, {
    "Content-Type": "video/mp4",
    "Content-Length": end - start + 1,
    "Content-Range": `bytes ${start}-${end}/${size}`,
    "Accept-Ranges": "bytes",
  });
  createReadStream(VIDEO, { start, end }).pipe(res);
}

async function handleSse(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (active !== null) {
    active.abort();
    active = null;
  }

  const controller = new AbortController();
  active = controller;
  req.on("close", () => {
    if (active === controller) {
      controller.abort();
      active = null;
    }
  });

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  try {
    await startScribeRealtime({
      signal: controller.signal,
      onSession: () => {
        sendSse(res, "session", { ok: true });
      },
      onPartial: (text, elapsedMs) => {
        sendSse(res, "partial", { text, elapsedMs });
      },
      onCommitted: (text, elapsedMs, words) => {
        sendSse(res, "committed", {
          text,
          elapsedMs,
          ...(words ? { timestamps: words } : {}),
        });
      },
      onMetrics: (metrics) => {
        sendSse(res, "metrics", metrics);
      },
      onFinished: () => {
        sendSse(res, "finished", { ok: true });
      },
      onError: (message) => {
        sendSse(res, "error", { message });
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    if (message !== "aborted" && !res.writableEnded) {
      sendSse(res, "error", {
        message: "Could not connect to Scribe Realtime.",
      });
    }
  } finally {
    if (active === controller) {
      active = null;
    }
    if (!res.writableEnded) {
      res.end();
    }
  }
}

const server = createServer((req, res) => {
  const url = req.url ?? "/";
  const path = url.split("?")[0];

  if (path === "/" || path === "/index.html") {
    serveIndex(res);
    return;
  }
  if (path === "/video.mp4") {
    serveVideo(req, res);
    return;
  }
  if (path === "/api/realtime-transcription") {
    void handleSse(req, res);
    return;
  }

  res.writeHead(404);
  res.end("Not found");
});

server.listen(PORT, () => {
  console.log(`http://localhost:${PORT}`);
});
