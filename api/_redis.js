import { Redis } from "@upstash/redis";

const memory = new Map();

function getRedisClient() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) return null;
  return new Redis({ url, token });
}

export async function getValue(key) {
  const redis = getRedisClient();
  if (!redis) return memory.get(key) ?? null;
  return redis.get(key);
}

export async function setValue(key, value) {
  const redis = getRedisClient();
  if (!redis) {
    memory.set(key, value);
    return;
  }
  await redis.set(key, value);
}
