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

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "https://ramona-dsouza.github.io");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  try {
    const { message } = req.body || {};
    const input = typeof message === "string" && message.trim() ? message.trim() : "";

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
    if (!r.ok) return res.status(r.status).json({ error: data });

    const reply = extractAssistantText(data);
    return res.status(200).json({ reply });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}
