const WORKFLOW_ID = "wf_699c69fbec20819089926e5f931f03d10b5ea835ec169e04";

function extractReply(data) {
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
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const message = req.body?.message;
  const input = typeof message === "string" ? message.trim() : "";

  const r = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({ workflow_id: WORKFLOW_ID, input }),
  });

  const data = await r.json();
  const reply = extractReply(data);
  return res.status(200).json({ reply });
}
