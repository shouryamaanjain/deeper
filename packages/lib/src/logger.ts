import pino, { type LoggerOptions, type Logger } from "pino";

let _logger: Logger | null = null;

export function getLogger(options: LoggerOptions = {}): Logger {
  if (_logger) return _logger;
  const isProd = process.env.NODE_ENV === "production";
  _logger = pino({
    level: process.env.LOG_LEVEL || (isProd ? "info" : "debug"),
    transport: isProd
      ? undefined
      : {
          target: "pino-pretty",
          options: { colorize: true, translateTime: "SYS:standard" },
        },
    ...options,
  });
  return _logger;
}

export function childLogger(bindings: Record<string, unknown>): Logger {
  return getLogger().child(bindings);
}
