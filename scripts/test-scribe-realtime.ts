import { resolve } from "node:path";
import { config } from "dotenv";
import { MODEL_ID, startScribeRealtime } from "./scribe-realtime";

config({ path: resolve(process.cwd(), ".env.local"), quiet: true });

function truncate(text: string, max = 160): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) {
    return trimmed;
  }
  return `${trimmed.slice(0, max)}…`;
}

function summarizeWords(
  words: { text?: string; start?: number; end?: number }[] | null | undefined,
): string {
  if (words === null || words === undefined || words.length === 0) {
    return "(none)";
  }
  const timed = words.filter(
    (word) => word.start !== undefined || word.end !== undefined,
  );
  const preview = timed.slice(0, 8).map((word) => {
    const start = word.start?.toFixed(3) ?? "?";
    const end = word.end?.toFixed(3) ?? "?";
    return `${JSON.stringify(word.text ?? "")} ${start}-${end}`;
  });
  return `${timed.length} timed tokens; sample: ${preview.join(" | ")}`;
}

async function main(): Promise<void> {
  const t0 = performance.now();
  const result = await startScribeRealtime({
    onSession: () => {
      console.log("[SESSION]");
      console.log("connected");
    },
    onPartial: (text) => {
      console.log("[PARTIAL]");
      console.log(truncate(text));
    },
    onCommitted: (text, _elapsedMs, words) => {
      if (words !== undefined) {
        console.log("[TIMESTAMPS]");
        console.log(summarizeWords(words));
        return;
      }
      console.log("[COMMITTED]");
      console.log(truncate(text, 240));
    },
    onError: (message) => {
      console.log("[ERROR]");
      console.log(message);
    },
    onFinished: () => {
      console.log("[CLOSE]");
      console.log("connection closed");
    },
  });

  const joined = result.committedTexts.join(" ").toLowerCase();
  const coherent =
    joined.includes("beso") ||
    joined.includes("darmari") ||
    joined.includes("tiktok") ||
    joined.includes("instagram") ||
    joined.includes("yolo");

  const pass =
    result.sessionStarted &&
    result.partialEvents >= 1 &&
    result.committedEvents >= 1 &&
    result.timestampEvents >= 1 &&
    coherent &&
    result.error === undefined &&
    result.durationStreamedSec >= 1;

  console.log("");
  console.log("=== Scribe Realtime Test ===");
  console.log("");
  console.log("Model:");
  console.log(MODEL_ID);
  console.log("");
  console.log("Audio:");
  console.log("video.mp4");
  console.log("");
  console.log("Session started:");
  console.log(result.sessionStarted ? "OK" : "FAIL");
  console.log("");
  console.log("First partial:");
  console.log(
    result.firstPartialMs === undefined ? "n/a" : `${result.firstPartialMs} ms`,
  );
  console.log("");
  console.log("First committed:");
  console.log(
    result.firstCommittedMs === undefined
      ? "n/a"
      : `${result.firstCommittedMs} ms`,
  );
  console.log("");
  console.log("Partial events:");
  console.log(String(result.partialEvents));
  console.log("");
  console.log("Committed events:");
  console.log(String(result.committedEvents));
  console.log("");
  console.log("Timestamps:");
  console.log(result.timestampEvents > 0 ? "YES" : "NO");
  console.log("");
  console.log("Duration streamed:");
  console.log(`${result.durationStreamedSec.toFixed(1)} s`);
  console.log("");
  console.log("Connect setup:");
  console.log(`${Math.round(performance.now() - t0)} ms total wall time`);
  console.log("");
  console.log("RESULT:");
  console.log(pass ? "PASS" : "FAIL");

  if (!pass) {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "unknown error";
  console.error(message);
  process.exit(1);
});
