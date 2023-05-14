import Redis from "ioredis";

export function redis() {
  return new Redis({
    host: process.env.redis_host,
    port: parseInt(process.env.redis_port as string),
  });
}
