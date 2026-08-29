import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { config } from "dotenv";
import {
  AudioFormat,
  CommitStrategy,
  ElevenLabsClient,
  RealtimeEvents,
} from "@elevenlabs/elevenlabs-js";

config({ path: resolve(process.cwd(), ".env.local"), quiet: true });

const MODEL_ID = "scribe_v2_realtime";
const SAMPLE_RATE = 16000;
const BYTES_PER_SAMPLE = 2;
const CHUNK_MS = 250;
const CHUNK_BYTES = (SAMPLE_RATE * BYTES_PER_SAMPLE * CHUNK_MS) / 1000;
const FFMPEG_EXE =
  "C:\\Users\\HP\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-9.0.1-full_build\\bin\\ffmpeg.exe";
const VIDEO_PATH = resolve(process.cwd(), "video.mp4");

type WordStamp = {
  text?: string;
  start?: number;
  end?: number;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

function truncate(text: string, max = 160): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) {
    return trimmed;
  }
  return `${trimmed.slice(0, max)}…`;
}

function summarizeWords(words: WordStamp[] | null | undefined): string {
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
  if (process.env.ELEVENLABS_API_KEY === undefined || process.env.ELEVENLABS_API_KEY === "") {
    throw new Error("ELEVENLABS_API_KEY is not configured");
  }
  if (!existsSync(FFMPEG_EXE)) {
    throw new Error("FFmpeg executable was not found at the configured path");
  }
  if (!existsSync(VIDEO_PATH)) {
    throw new Error("video.mp4 was not found in the project root");
  }

  const t0 = performance.now();
  let sessionStartedAt: number | undefined;
  let firstPartialAt: number | undefined;
  let firstCommittedAt: number | undefined;
  let partialEvents = 0;
  let committedEvents = 0;
  let timestampEvents = 0;
  let bytesSent = 0;
  let sawError = false;
  const committedTexts: string[] = [];

  const client = new ElevenLabsClient({
    apiKey: process.env.ELEVENLABS_API_KEY,
  });

  const connection = await client.speechToText.realtime.connect({
    modelId: MODEL_ID,
    audioFormat: AudioFormat.PCM_16000,
    sampleRate: SAMPLE_RATE,
    includeTimestamps: true,
    commitStrategy: CommitStrategy.VAD,
    vadSilenceThresholdSecs: 1.5,
    vadThreshold: 0.4,
    minSpeechDurationMs: 100,
    minSilenceDurationMs: 100,
  });

  const sessionReady = new Promise<void>((resolveSession, rejectSession) => {
    const timer = setTimeout(() => {
      rejectSession(new Error("Timed out waiting for SESSION_STARTED"));
    }, 15000);

    connection.on(RealtimeEvents.SESSION_STARTED, () => {
      clearTimeout(timer);
      sessionStartedAt = performance.now();
      console.log("[SESSION]");
      console.log("connected");
      resolveSession();
    });
  });

  connection.on(RealtimeEvents.PARTIAL_TRANSCRIPT, (data) => {
    const text = typeof data.text === "string" ? data.text : "";
    if (text.trim() === "") {
      return;
    }
    partialEvents += 1;
    if (firstPartialAt === undefined) {
      firstPartialAt = performance.now();
    }
    console.log("[PARTIAL]");
    console.log(truncate(text));
  });

  connection.on(RealtimeEvents.COMMITTED_TRANSCRIPT, (data) => {
    const text = typeof data.text === "string" ? data.text : "";
    if (text.trim() === "") {
      return;
    }
    committedEvents += 1;
    committedTexts.push(text);
    if (firstCommittedAt === undefined) {
      firstCommittedAt = performance.now();
    }
    console.log("[COMMITTED]");
    console.log(truncate(text, 240));
  });

  connection.on(RealtimeEvents.COMMITTED_TRANSCRIPT_WITH_TIMESTAMPS, (data) => {
    timestampEvents += 1;
    const words = data.words ?? [];
    console.log("[TIMESTAMPS]");
    console.log(summarizeWords(words));
  });

  connection.on(RealtimeEvents.ERROR, (error) => {
    sawError = true;
    const message = error instanceof Error ? error.message : "realtime error";
    console.log("[ERROR]");
    console.log(message);
  });

  connection.on(RealtimeEvents.CLOSE, () => {
    console.log("[CLOSE]");
    console.log("connection closed");
  });

  await sessionReady;

  const ffmpeg = spawn(
    FFMPEG_EXE,
    [
      "-hide_banner",
      "-loglevel",
      "error",
      "-i",
      VIDEO_PATH,
      "-vn",
      "-ac",
      "1",
      "-ar",
      String(SAMPLE_RATE),
      "-f",
      "s16le",
      "-acodec",
      "pcm_s16le",
      "pipe:1",
    ],
    { windowsHide: true },
  );

  let pending = Buffer.alloc(0);
  ffmpeg.stderr.on("data", (chunk: Buffer) => {
    const text = chunk.toString("utf8").trim();
    if (text !== "") {
      console.log("[FFMPEG]");
      console.log(text);
    }
  });

  const ffmpegExit = new Promise<void>((resolveExit, rejectExit) => {
    ffmpeg.on("error", rejectExit);
    ffmpeg.on("close", (code) => {
      if (code === 0 || code === null) {
        resolveExit();
      } else {
        rejectExit(new Error(`FFmpeg exited with code ${code}`));
      }
    });
  });

  async function sendChunk(chunk: Buffer): Promise<void> {
    connection.send({
      audioBase64: chunk.toString("base64"),
      sampleRate: SAMPLE_RATE,
    });
    bytesSent += chunk.length;
    await sleep(CHUNK_MS);
  }

  ffmpeg.stdout.on("data", (chunk: Buffer) => {
    pending = Buffer.concat([pending, chunk]);
  });

  while (ffmpeg.stdout.readable || pending.length >= CHUNK_BYTES) {
    while (pending.length >= CHUNK_BYTES) {
      const chunk = pending.subarray(0, CHUNK_BYTES);
      pending = pending.subarray(CHUNK_BYTES);
      await sendChunk(chunk);
    }
    if (!ffmpeg.stdout.readableEnded) {
      await sleep(20);
    } else {
      break;
    }
  }

  if (pending.length > 0) {
    await sendChunk(pending);
    pending = Buffer.alloc(0);
  }

  await ffmpegExit;

  await sleep(2000);
  if (committedEvents === 0) {
    connection.commit();
    await sleep(1500);
  }

  await sleep(1500);
  connection.close();

  const durationStreamedSec = bytesSent / (SAMPLE_RATE * BYTES_PER_SAMPLE);
  const firstPartialMs =
    firstPartialAt === undefined || sessionStartedAt === undefined
      ? undefined
      : Math.round(firstPartialAt - sessionStartedAt);
  const firstCommittedMs =
    firstCommittedAt === undefined || sessionStartedAt === undefined
      ? undefined
      : Math.round(firstCommittedAt - sessionStartedAt);

  const joined = committedTexts.join(" ").toLowerCase();
  const coherent =
    joined.includes("beso") ||
    joined.includes("darmari") ||
    joined.includes("tiktok") ||
    joined.includes("instagram") ||
    joined.includes("yolo");

  const pass =
    sessionStartedAt !== undefined &&
    partialEvents >= 1 &&
    committedEvents >= 1 &&
    timestampEvents >= 1 &&
    coherent &&
    !sawError &&
    durationStreamedSec >= 1;

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
  console.log(sessionStartedAt === undefined ? "FAIL" : "OK");
  console.log("");
  console.log("First partial:");
  console.log(firstPartialMs === undefined ? "n/a" : `${firstPartialMs} ms`);
  console.log("");
  console.log("First committed:");
  console.log(firstCommittedMs === undefined ? "n/a" : `${firstCommittedMs} ms`);
  console.log("");
  console.log("Partial events:");
  console.log(String(partialEvents));
  console.log("");
  console.log("Committed events:");
  console.log(String(committedEvents));
  console.log("");
  console.log("Timestamps:");
  console.log(timestampEvents > 0 ? "YES" : "NO");
  console.log("");
  console.log("Duration streamed:");
  console.log(`${durationStreamedSec.toFixed(1)} s`);
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
