import { createConsola, LogLevels } from "consola";

const envLevel = (process.env.LOG_LEVEL ?? "info").toLowerCase();

const levelMap: Record<string, number> = {
  silent: LogLevels.silent,
  error: LogLevels.error,
  warn: LogLevels.warn,
  info: LogLevels.info,
  debug: LogLevels.debug,
  trace: LogLevels.trace,
};

export const logger = createConsola({
  level: levelMap[envLevel] ?? LogLevels.info,
  formatOptions: {
    colors: true,
    date: true,
  },
}).withTag("close-claw");
