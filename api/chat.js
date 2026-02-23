// api/chat.js
export default async function handler(req, res) {
  // Allow CORS from your GitHub Pages frontend
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { message } = req.body;

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        workflow_id: 'wf_699c69fbec20819089926e5f931f03d10b5ea835ec169e04',
        input: message,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || 'OpenAI error' });
    }

    // Extract the text from the response
    const output = data.output?.[0]?.content?.[0]?.text || data.output_text || 'No response';
    res.status(200).json({ reply: output });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}