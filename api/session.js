export default async function handler(req, res) {
    if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  
    try {
      const r = await fetch("https://api.openai.com/v1/chatkit/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "OpenAI-Beta": "chatkit_beta=v1",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          workflow: { id: "wf_699c69fbec20819089926e5f931f03d10b5ea835ec169e04" },
          user: "website-user"
        }),
      });
  
      const data = await r.json();
      if (!r.ok) return res.status(r.status).json({ error: data });
  
      return res.status(200).json({ client_secret: data.client_secret });
    } catch (e) {
      return res.status(500).json({ error: String(e) });
    }
  }