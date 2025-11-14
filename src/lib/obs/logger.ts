// src/lib/obs/logger.ts
import https, { type RequestOptions } from "node:https";
import { Writable } from "node:stream";

import pino, { type LoggerOptions, type Logger } from "pino";
import { getLoggingConfig } from "../../config/logging";

type JsonLine = string;

function createBaseLogger(): Logger {
  const config = getLoggingConfig();
  const opts: LoggerOptions = {
    level: config.level,
    messageKey: "msg",
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      // make `level` a JSON field
      level: (label: string) => ({ level: label }),
      // Add service name and Vercel metadata for better filtering
      bindings: () => ({
        service: "luton-eng-dashboard",
        // Vercel automatically adds these, but we include them for consistency
        vercel_env: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown",
        vercel_region: process.env.VERCEL_REGION ?? "unknown",
      }),
    },
    // Add error serialization for better stack traces
    serializers: {
      err: pino.stdSerializers.err,
    },
  };
  return pino(opts);
}

// ---------------- Better Stack (Logtail) transport ----------------

function createLogtailTransport(): Writable | null {
  const config = getLoggingConfig();
  if (!config.logtail.enabled) return null;

  const url = config.logtail.url;
  const token = config.logtail.token;
  if (!url || !token) return null;

  try {
    // Parse URL once
    const u = new URL(url);
    const optionsBase: RequestOptions = {
      method: "POST",
      hostname: u.hostname,
      path: u.pathname + u.search,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    };

    return new Writable({
      write(chunk: Buffer, _enc, cb) {
        const req = https.request(optionsBase, (res) => {
          // drain response to free socket
          res.on("data", () => {});
          res.on("end", () => cb());
        });
        req.on("error", (err) => cb(err));
        req.write(chunk);
        req.end();
      },
    });
  } catch (err) {
    // If URL is invalid, log to console and return null (disable transport)
    console.warn("[LOGTAIL] Invalid LOGTAIL_URL, disabling Logtail transport:", err);
    return null;
  }
}

// ---------------- Grafana Cloud Loki transport ----------------

function createLokiTransport(): Writable | null {
  const config = getLoggingConfig();
  if (!config.loki.enabled) return null;

  const urlStr = config.loki.url;
  const user = config.loki.user;
  const pass = config.loki.password;
  if (!urlStr || !user || !pass) return null;

  try {
    const u = new URL(urlStr);
    const auth = Buffer.from(`${user}:${pass}`).toString("base64");
    const optionsBase: RequestOptions = {
      method: "POST",
      hostname: u.hostname,
      path: u.pathname + u.search,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
      },
    };

    // Buffer tiny batches (we have very low volume)
    const buf: JsonLine[] = [];
    let timer: NodeJS.Timeout | null = null;

    function flush(cb?: (err?: Error) => void) {
      if (buf.length === 0) return cb?.();

      const lines = buf.splice(0, buf.length);
      // Loki needs [[timestampNs, line], ...]
      // Use string concatenation instead of BigInt to avoid potential issues
      const nowMs = Date.now();
      const nowNs = String(nowMs * 1_000_000);

      const payload = JSON.stringify({
        streams: [
          {
            stream: {
              service: "luton-eng-dashboard",
              env: process.env.NODE_ENV ?? "dev",
            },
            values: lines.map((line) => [nowNs, line]),
          },
        ],
      });

      const req = https.request(optionsBase, (res) => {
        // Log response status for debugging (only in dev)
        if (process.env.NODE_ENV !== 'production') {
          if (res.statusCode !== 204 && res.statusCode !== 200) {
            console.warn(`[LOKI] Unexpected status code: ${res.statusCode}`);
          } else {
            console.log(`[LOKI] ✅ Logs sent successfully (${lines.length} lines)`);
          }
        }
        res.on("data", () => {});
        res.on("end", () => cb?.());
      });
      req.on("error", (err) => {
        if (process.env.NODE_ENV !== 'production') {
          console.error('[LOKI] ❌ Error sending logs:', err);
        }
        cb?.(err);
      });
      req.write(payload);
      req.end();
    }

    return new Writable({
      write(chunk: Buffer, _enc, cb) {
        buf.push(chunk.toString());
        if (!timer) {
          timer = setTimeout(() => {
            timer = null;
            flush();
          }, 1000); // Increased debounce to 1 second to ensure batching works
        }
        cb();
      },
      final(cb) {
        // Force flush on final
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
        flush(cb);
      },
    });
  } catch (err) {
    // If URL is invalid, log to console and return null (disable transport)
    console.warn("[LOKI] Invalid LOKI_URL, disabling Loki transport:", err);
    return null;
  }
}

// ---------------- Fan-out logger (write to both if enabled) ----------------

// Wrap logger initialization in try-catch to prevent module load failures
let base: Logger;
let logtail: Writable | null = null;
let loki: Writable | null = null;

try {
  base = createBaseLogger();
  logtail = createLogtailTransport();
  loki = createLokiTransport();

  // Debug: Log if Loki is enabled (only in development)
  if (process.env.NODE_ENV !== 'production' && process.env.LOG_ENABLE_LOKI === 'true') {
    if (loki) {
      console.log('[LOGGER] ✅ Loki transport enabled and ready');
    } else {
      console.warn('[LOGGER] ⚠️ Loki transport disabled - check LOKI_URL, LOKI_USER, LOKI_PASS in .env.local');
    }
  }
} catch (err) {
  // If logger initialization fails, create a minimal fallback logger
  console.error('[LOGGER] Failed to initialize logger, using fallback:', err);
  base = pino({ level: 'info' });
  logtail = null;
  loki = null;
}

// We emit once, and, if transports exist, also forward the raw JSON line to them.
// Pino lets us hook `hooks.logMethod` to intercept the final line.
export const logger: Logger = pino(
  {
    ...((base as any).bindings?.() ?? {}),
    level: base.level,
    messageKey: "msg",
    hooks: {
      logMethod(args: unknown[], method: (...a: any[]) => void, level: number) {
        // call original
        method.apply(this, args);

        // json line already serialized in destination? Not directly exposed.
        // Instead, serialize the object again (our volume is tiny)
        try {
          const obj = args.length > 1 ? args[1] : args[0];
          const msg = typeof args[0] === "string" ? args[0] : undefined;
          const record = typeof obj === "object" && obj !== null ? { ...obj } : { msg: String(msg ?? "") };

          // add level if not present
          if (typeof (record as any).level === "undefined") {
            const label = (pino.levels.labels as Record<number, string>)[level] ?? "info";
            (record as any).level = label;
          }
          const line = JSON.stringify(record);

          if (logtail) logtail.write(Buffer.from(line));
          if (loki) loki.write(Buffer.from(line));
        } catch {
          // swallow – transport failures shouldn't crash app
        }
      },
    },
  },
  // Send primary output to stdout (optional).
  pino.destination(1),
);

// Convenience to add stable fields
export function logBase(fields: Record<string, unknown>) {
  return logger.child(fields);
}
