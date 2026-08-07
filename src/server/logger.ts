import pino from 'pino';

/**
 * Shared structured logger for the BFF's own outbound server-to-server calls
 * (identity-client, gateway-proxy) and its error-handling boundaries
 * (server.ts, routes.ts). Replaces the previous bare `console.error`/
 * `console.log` calls, which gave no persistent, inspectable record — a
 * downstream failure was only ever visible for as long as the terminal
 * scrollback lasted, if that, and carried no structured fields (request
 * path, session id, upstream status) to search/alert on.
 *
 * Writes to *both* stdout (so container log aggregation / `docker logs`
 * still works exactly as before) and a local file with full structured
 * detail — including a real stack trace for any `err` field, via pino's
 * standard error serializer.
 *
 * LOG_FILE_PATH defaults to ./logs/bff-server.log, relative to the process's
 * cwd (the repo root in dev, or /app in the Docker image). Point it at a
 * mounted volume in any environment where the container filesystem doesn't
 * survive a restart/redeploy.
 */
const LOG_FILE_PATH = process.env['LOG_FILE_PATH'] ?? 'logs/bff-server.log';
const LOG_LEVEL = process.env['LOG_LEVEL'] ?? 'info';

export const logger = pino(
  {
    level: LOG_LEVEL,
    base: { pid: process.pid },
    timestamp: pino.stdTimeFunctions.isoTime,
    serializers: { err: pino.stdSerializers.err },
  },
  pino.multistream([
    { level: LOG_LEVEL, stream: process.stdout },
    { level: LOG_LEVEL, stream: pino.destination({ dest: LOG_FILE_PATH, mkdir: true, sync: false }) },
  ]),
);
