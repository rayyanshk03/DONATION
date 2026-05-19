import { Redis } from "ioredis";
import { env } from "../config/env.js";

export const redis = env.redisUrl
  ? new Redis(env.redisUrl)
  : null;

export async function getCache<T>(key: string): Promise<T | null> {
  if (!redis) return null;
  const raw = await redis.get(key);
  return raw ? (JSON.parse(raw) as T) : null;
}

export async function setCache<T>(key: string, value: T, ttlSeconds: number) {
  if (!redis) return;
  await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
}
