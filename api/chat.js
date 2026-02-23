// Allowed CORS origin (single origin)
const ALLOWED_ORIGIN = "https://ramona-dsouza.github.io";
const MAX_MESSAGE_LENGTH = 8000;

// IP rate limit: 10 requests per IP per 60 seconds (in-memory Map)
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;
const rateLimitMap = new Map(); // ip -> { count, windowStart }

function getClientIp(req) {
  // Vercel: x-vercel-forwarded-for (single IP) or x-forwarded-for (client, proxy1, ...)
  const raw =
    req.headers["x-vercel-forwarded-for"] ||
    req.headers["x-forwarded-for"];
  if (raw) {
    const s = typeof raw === "string" ? raw : (Array.isArray(raw) ? raw[0] : String(raw ?? ""));
    const first = (s.split(",")[0] || "").trim();
    if (first) return first;
  }
  return req.headers["x-real-ip"] || "unknown";
}

function isRateLimited(ip) {
  const now = Date.now();
  // Prune expired entries to avoid unbounded growth
  for (const [key, val] of rateLimitMap.entries()) {
    if (now - val.windowStart >= RATE_LIMIT_WINDOW_MS) rateLimitMap.delete(key);
  }
  const entry = rateLimitMap.get(ip);
  if (!entry) {
    rateLimitMap.set(ip, { count: 1, windowStart: now });
    return false;
  }
  if (now - entry.windowStart >= RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(ip, { count: 1, windowStart: now });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT_MAX;
}

function extractAssistantText(data) {
  const items = data.output_items ?? data.output ?? [];
  for (const item of [...items].reverse()) {
    if (item.type === "message" && Array.isArray(item.content)) {
      for (const block of item.content) {
        if (block.type === "output_text" && block.text) return block.text;
      }
    }
  }
  return "";
}

function corsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Max-Age", "86400");
}

export default async function handler(req, res) {
  corsHeaders(res);

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const clientIp = getClientIp(req);
  if (isRateLimited(clientIp)) {
    return res.status(429).json({ error: "Rate limit exceeded" });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: "Server configuration error" });
  }

  try {
    const { message } = req.body || {};
    const input = typeof message === "string" && message.trim() ? message.trim() : "";

    if (input.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({ error: "Message too long" });
    }

    const r = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: input,
      }),
    });

    const data = await r.json();
    if (!r.ok) {
      // Never expose OpenAI error details or API key to client
      return res.status(502).json({ error: "Upstream request failed" });
    }

    const reply = extractAssistantText(data);
    return res.status(200).json({ reply });
  } catch (e) {
    // Log server-side only; never expose stack or message to client
    console.error("chat error", e);
    return res.status(500).json({ error: "Internal server error" });
  }
}
