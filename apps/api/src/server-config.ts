export function resolveApiPort(env: NodeJS.ProcessEnv = process.env) {
  const rawPort = env.PORT ?? env.API_PORT ?? '4000';
  const port = Number(rawPort);

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(`Invalid API port: ${rawPort}`);
  }

  return port;
}
