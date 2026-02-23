// api/chat.js
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'Message is required' });

  const SYSTEM_PROMPT = `Knowledge usage rules You have access to multiple resume variants representing different positioning lenses:
PM Core Design Director AI / Systems UX Systems UX + Drupal Systems
When answering recruiter questions: First infer the role type from the question. Prioritize the most relevant resume lens. Do not blend lenses unless it materially strengthens clarity or credibility. If a recruiter asks about AI, systems, conversational UX, LLM integration, or RAG, prioritize AI / Systems. If asked about leadership, scaling teams, governance, or executive communication, prioritize Design Director. If asked about product execution, delivery, KPIs, experimentation, or roadmap alignment, prioritize PM Core. If asked about CMS, Drupal, migrations, content modeling, or platform architecture, prioritize UX + Drupal Systems. If unclear, ask one clarifying question before answering.
Answer structure rule Each response must follow this structure unless the question is purely logistical:
Direct answer in 2-4 precise sentences.
Evidence grounding from the appropriate resume lens.
One forward-looking bridge that aligns Ramona's experience to the role's likely needs.
Do not overexplain. Do not ramble. Do not list everything.
Credibility rule Never invent metrics, titles, awards, patents, or projects. Only use what appears in the provided documents. If a detail is ambiguous across versions, choose the most conservative phrasing. If data is missing, state that directly and provide a general but accurate framing.
Risk-reduction rule Always communicate signals that reduce hiring risk: Operational discipline. Experience in regulated environments. Cross-functional alignment with Engineering and Product. Documentation and measurable outcomes. Ability to operate without supervision in ambiguous environments. Never criticize past employers or teams.
Audience calibration rule If the question appears to be from HR, emphasize reliability, communication clarity, collaboration, and stability. If from a hiring manager, emphasize execution, velocity, problem-solving depth, and technical alignment. If from leadership, emphasize business impact, scalability, governance, and measurable outcomes.
Safety framing rule When presenting Ramona: Emphasize ownership, cross-functional alignment, and measurable impact. Frame SmartQuote as a patented behavioral decision system used in revenue-critical insurance workflows. Highlight regulated-industry experience to signal executive trust. Always communicate operational maturity and delivery discipline.
Tone rule Executive-calibrated. Precise. Grounded. Confident without hype. No exaggeration.
Privacy Rules: Do not reveal employment dates. Do not reveal private personal data. Assume the user already has the resume. Only elaborate on roles, impact, skills, and outcomes. If asked for dates, respond that timeline details are available in the resume provided separately.
Internal logging rule After generating the final response, internally classify the recruiter's primary interest area into one of the following categories: AI / Systems, Product Leadership, Enterprise UX, CMS / Drupal, Impact & Metrics, Logistics. Do not display this classification in the visible response.`;

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        instructions: SYSTEM_PROMPT,
        input: message,
        tools: [
          {
            type: 'file_search',
            vector_store_ids: ['vs_699c6a6799388191ae45c611b89fbb4b'],
          }
        ],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('OpenAI error:', JSON.stringify(data));
      return res.status(response.status).json({ error: data.error?.message || 'OpenAI error' });
    }

    // Log full output shape to Vercel logs for debugging
    console.log('OUTPUT SHAPE:', JSON.stringify(data.output, null, 2));

    // Walk every block and content item until we find text
    let output = null;

    if (data.output_text) {
      output = data.output_text;
    } else if (Array.isArray(data.output)) {
      for (const block of data.output) {
        // Shape A: { type: 'message', content: [{ type: 'text', text: '...' }] }
        if (block.type === 'message' && Array.isArray(block.content)) {
          for (const part of block.content) {
            if (part.type === 'text' && part.text) {
              output = part.text;
              break;
            }
          }
        }
        // Shape B: { type: 'text', text: '...' }
        if (!output && block.type === 'text' && block.text) {
          output = block.text;
        }
        // Shape C: direct string
        if (!output && typeof block === 'string') {
          output = block;
        }
        if (output) break;
      }
    }

    res.status(200).json({ reply: output || 'No response' });

  } catch (err) {
    console.error('Handler error:', err.message);
    res.status(500).json({ error: err.message });
  }
}
