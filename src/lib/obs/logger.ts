// src/lib/obs/logger.ts
import https, { type RequestOptions } from "node:https";
import { Writable } from "node:stream";

import pino, { type LoggerOptions, type Logger } from "pino";

type JsonLine = string;

function createBaseLogger(): Logger {
  const opts: LoggerOptions = {
    level: process.env.LOG_LEVEL ?? "info",
    messageKey: "msg",
    formatters: {
      // make `level` a JSON field
      level: (label: string) => ({ level: label }),
    },
  };
  return pino(opts);
}

// ---------------- Better Stack (Logtail) transport ----------------

function createLogtailTransport(): Writable | null {
  if (process.env.LOG_ENABLE_LOGTAIL !== "true") return null;

  const url = process.env.LOGTAIL_URL;
  const token = process.env.LOGTAIL_TOKEN;
  if (!url || !token) return null;

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
}

// ---------------- Grafana Cloud Loki transport ----------------

function createLokiTransport(): Writable | null {
  if (process.env.LOG_ENABLE_LOKI !== "true") return null;

  const urlStr = process.env.LOKI_URL;
  const user = process.env.LOKI_USER;
  const pass = process.env.LOKI_PASS;
  if (!urlStr || !user || !pass) return null;

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
    const nowNs = BigInt(Date.now()) * 1_000_000n;

    const payload = JSON.stringify({
      streams: [
        {
          stream: {
            app: "tally-card-manager",
            env: process.env.NODE_ENV ?? "dev",
          },
          values: lines.map((line) => [nowNs.toString(), line]),
        },
      ],
    });

    const req = https.request(optionsBase, (res) => {
      res.on("data", () => {});
      res.on("end", () => cb?.());
    });
    req.on("error", (err) => cb?.(err));
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
        }, 400); // tiny debounce
      }
      cb();
    },
    final(cb) {
      flush(cb);
    },
  });
}

// ---------------- Fan-out logger (write to both if enabled) ----------------

const base = createBaseLogger();

const logtail = createLogtailTransport();
const loki = createLokiTransport();

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
