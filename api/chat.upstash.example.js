/**
 * Production-grade rate limiting with Upstash Redis.
 * Replace the in-memory rate limit in api/chat.js with this when you need
 * global, consistent limits across all Vercel instances.
 *
 * Setup:
 * 1. Create a Redis database at https://console.upstash.com
 * 2. npm install @upstash/redis @upstash/ratelimit
 * 3. Add env: UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN
 * 4. Use getClientIp() from chat.js; then replace isRateLimited(ip) with the block below.
 */

import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

const ratelimit =
  redis &&
  new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, "60 s"),
    analytics: true,
  });

async function isRateLimitedUpstash(ip) {
  if (!ratelimit) return false;
  const { success } = await ratelimit.limit(ip);
  return !success;
}

// In handler, replace the in-memory check with:
//   const clientIp = getClientIp(req);
//   if (await isRateLimitedUpstash(clientIp)) {
//     return res.status(429).json({ error: "Rate limit exceeded" });
//   }
