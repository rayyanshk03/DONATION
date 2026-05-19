import { Redis } from "ioredis";
import { env } from "../config/env.js";
export const redis = env.redisUrl
    ? new Redis(env.redisUrl)
    : null;
export async function getCache(key) {
    if (!redis)
        return null;
    const raw = await redis.get(key);
    return raw ? JSON.parse(raw) : null;
}
export async function setCache(key, value, ttlSeconds) {
    if (!redis)
        return;
    await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
}
