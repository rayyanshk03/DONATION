import { Redis } from "ioredis";
import { env } from "../config/env.js";

/**
 * Redis client — fully optional.
 * If REDIS_URL is not set or connection fails, the backend runs
 * without caching (slightly higher DB load, but functional).
 */
function createRedis(): Redis | null {
  if (!env.redisUrl) return null;

  try {
    const client = new Redis(env.redisUrl, {
      maxRetriesPerRequest: 1,
      retryStrategy(times: number) {
        if (times > 3) {
          console.warn("[Redis] Max retries exceeded. Running without Redis cache.");
          return null; // Stop retrying
        }
        return Math.min(times * 200, 2000);
      },
      lazyConnect: true,
    });

    // Suppress unhandled error events from crashing the process
    client.on("error", (err) => {
      console.warn("[Redis] Connection error (non-fatal):", err.message);
    });

    // Attempt connection
    client.connect().catch((err) => {
      console.warn("[Redis] Initial connection failed (running without cache):", err.message);
    });

    return client;
  } catch (err) {
    console.warn("[Redis] Failed to create client:", (err as Error).message);
    return null;
  }
}

export const redis = createRedis();

export async function getCache<T>(key: string): Promise<T | null> {
  if (!redis) return null;
  try {
    const raw = await redis.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export async function setCache<T>(key: string, value: T, ttlSeconds: number) {
  if (!redis) return;
  try {
    await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
  } catch {
    // Cache write failure is non-fatal
  }
}
