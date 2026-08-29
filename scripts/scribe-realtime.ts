import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  AudioFormat,
  CommitStrategy,
  ElevenLabsClient,
  RealtimeEvents,
} from "@elevenlabs/elevenlabs-js";

export const MODEL_ID = "scribe_v2_realtime";
export const SAMPLE_RATE = 16000;
const BYTES_PER_SAMPLE = 2;
const CHUNK_MS = 250;
const CHUNK_BYTES = (SAMPLE_RATE * BYTES_PER_SAMPLE * CHUNK_MS) / 1000;
const FFMPEG_EXE =
  "C:\\Users\\HP\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-9.0.1-full_build\\bin\\ffmpeg.exe";
export const VIDEO_PATH = resolve(process.cwd(), "video.mp4");

export type ScribeWord = {
  text?: string;
  start?: number;
  end?: number;
};

export type ScribeRunResult = {
  sessionStarted: boolean;
  firstPartialMs?: number;
  firstCommittedMs?: number;
  partialEvents: number;
  committedEvents: number;
  timestampEvents: number;
  durationStreamedSec: number;
  committedTexts: string[];
  error?: string;
};

export type StartScribeRealtimeOptions = {
  signal?: AbortSignal;
  onSession?: () => void;
  onPartial?: (text: string, elapsedMs: number) => void;
  onCommitted?: (
    text: string,
    elapsedMs: number,
    words?: ScribeWord[] | null,
  ) => void;
  onMetrics?: (metrics: {
    firstPartialMs?: number;
    firstCommittedMs?: number;
    durationStreamedSec: number;
  }) => void;
  onFinished?: () => void;
  onError?: (message: string) => void;
};

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolveSleep, rejectSleep) => {
    if (signal?.aborted) {
      rejectSleep(new Error("aborted"));
      return;
    }
    const timer = setTimeout(resolveSleep, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        rejectSleep(new Error("aborted"));
      },
      { once: true },
    );
  });
}

function emitMetrics(
  options: StartScribeRealtimeOptions,
  firstPartialMs: number | undefined,
  firstCommittedMs: number | undefined,
  durationStreamedSec: number,
): void {
  options.onMetrics?.({
    firstPartialMs,
    firstCommittedMs,
    durationStreamedSec,
  });
}

export async function startScribeRealtime(
  options: StartScribeRealtimeOptions = {},
): Promise<ScribeRunResult> {
  if (process.env.ELEVENLABS_API_KEY === undefined || process.env.ELEVENLABS_API_KEY === "") {
    throw new Error("ELEVENLABS_API_KEY is not configured");
  }
  if (!existsSync(FFMPEG_EXE)) {
    throw new Error("FFmpeg executable was not found at the configured path");
  }
  if (!existsSync(VIDEO_PATH)) {
    throw new Error("video.mp4 was not found in the project root");
  }

  const result: ScribeRunResult = {
    sessionStarted: false,
    partialEvents: 0,
    committedEvents: 0,
    timestampEvents: 0,
    durationStreamedSec: 0,
    committedTexts: [],
  };

  let sessionStartedAt: number | undefined;
  let firstPartialAt: number | undefined;
  let firstCommittedAt: number | undefined;
  let bytesSent = 0;
  let ffmpeg: ChildProcessWithoutNullStreams | undefined;

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

  const cleanup = () => {
    try {
      ffmpeg?.kill();
    } catch {
      /* ignore */
    }
    try {
      connection.close();
    } catch {
      /* ignore */
    }
  };

  if (options.signal?.aborted) {
    cleanup();
    throw new Error("aborted");
  }
  options.signal?.addEventListener("abort", cleanup, { once: true });

  try {
    const sessionReady = new Promise<void>((resolveSession, rejectSession) => {
      const timer = setTimeout(() => {
        rejectSession(new Error("Timed out waiting for SESSION_STARTED"));
      }, 15000);

      connection.on(RealtimeEvents.SESSION_STARTED, () => {
        clearTimeout(timer);
        sessionStartedAt = performance.now();
        result.sessionStarted = true;
        options.onSession?.();
        resolveSession();
      });
    });

    connection.on(RealtimeEvents.PARTIAL_TRANSCRIPT, (data) => {
      const text = typeof data.text === "string" ? data.text : "";
      if (text.trim() === "" || sessionStartedAt === undefined) {
        return;
      }
      result.partialEvents += 1;
      if (firstPartialAt === undefined) {
        firstPartialAt = performance.now();
        result.firstPartialMs = Math.round(firstPartialAt - sessionStartedAt);
      }
      const elapsedMs = Math.round(performance.now() - sessionStartedAt);
      options.onPartial?.(text, elapsedMs);
      emitMetrics(
        options,
        result.firstPartialMs,
        result.firstCommittedMs,
        bytesSent / (SAMPLE_RATE * BYTES_PER_SAMPLE),
      );
    });

    connection.on(RealtimeEvents.COMMITTED_TRANSCRIPT, (data) => {
      const text = typeof data.text === "string" ? data.text : "";
      if (text.trim() === "" || sessionStartedAt === undefined) {
        return;
      }
      result.committedEvents += 1;
      result.committedTexts.push(text);
      if (firstCommittedAt === undefined) {
        firstCommittedAt = performance.now();
        result.firstCommittedMs = Math.round(firstCommittedAt - sessionStartedAt);
      }
      const elapsedMs = Math.round(performance.now() - sessionStartedAt);
      options.onCommitted?.(text, elapsedMs);
      emitMetrics(
        options,
        result.firstPartialMs,
        result.firstCommittedMs,
        bytesSent / (SAMPLE_RATE * BYTES_PER_SAMPLE),
      );
    });

    connection.on(RealtimeEvents.COMMITTED_TRANSCRIPT_WITH_TIMESTAMPS, (data) => {
      result.timestampEvents += 1;
      const text = typeof data.text === "string" ? data.text : "";
      if (text.trim() === "" || sessionStartedAt === undefined) {
        return;
      }
      const elapsedMs = Math.round(performance.now() - sessionStartedAt);
      options.onCommitted?.(text, elapsedMs, data.words ?? null);
    });

    connection.on(RealtimeEvents.ERROR, (error) => {
      const message = error instanceof Error ? error.message : "realtime error";
      result.error = message;
      options.onError?.(message);
    });

    await sessionReady;

    ffmpeg = spawn(
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
        result.error = text;
        options.onError?.(text);
      }
    });

    const ffmpegExit = new Promise<void>((resolveExit, rejectExit) => {
      ffmpeg?.on("error", rejectExit);
      ffmpeg?.on("close", (code) => {
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
      await sleep(CHUNK_MS, options.signal);
    }

    ffmpeg.stdout.on("data", (chunk: Buffer) => {
      pending = Buffer.concat([pending, chunk]);
    });

    while (
      (ffmpeg.stdout.readable || pending.length >= CHUNK_BYTES) &&
      !options.signal?.aborted
    ) {
      while (pending.length >= CHUNK_BYTES) {
        const chunk = pending.subarray(0, CHUNK_BYTES);
        pending = pending.subarray(CHUNK_BYTES);
        await sendChunk(chunk);
      }
      if (!ffmpeg.stdout.readableEnded) {
        await sleep(20, options.signal);
      } else {
        break;
      }
    }

    if (pending.length > 0 && !options.signal?.aborted) {
      await sendChunk(pending);
    }

    await ffmpegExit;

    if (!options.signal?.aborted) {
      await sleep(2000, options.signal);
      if (result.committedEvents === 0) {
        connection.commit();
        await sleep(1500, options.signal);
      }
      await sleep(1500, options.signal);
    }

    result.durationStreamedSec = bytesSent / (SAMPLE_RATE * BYTES_PER_SAMPLE);
    emitMetrics(
      options,
      result.firstPartialMs,
      result.firstCommittedMs,
      result.durationStreamedSec,
    );
    options.onFinished?.();
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    if (message !== "aborted") {
      result.error = message;
      options.onError?.(message);
    }
    throw error;
  } finally {
    cleanup();
  }
}
