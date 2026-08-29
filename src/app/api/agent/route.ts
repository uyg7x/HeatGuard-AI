import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const AI_BASE_URL = process.env.AI_BASE_URL || 'https://api.groq.com/openai/v1';
    const AI_KEY = process.env.AI_KEY;
    const AI_MODEL = process.env.AI_MODEL || 'openai/gpt-oss-20b';

    // Log what we're about to call (visible in Vercel logs)
    const fullUrl = `${AI_BASE_URL}/chat/completions`;
    console.log(`[AI Agent] Calling: ${fullUrl} with model: ${AI_MODEL}`);

    if (!AI_KEY) {
      console.error('[AI Agent] AI_KEY is missing from env vars');
      return NextResponse.json({
        reply: '⚡ AI key not configured. Please contact the team.',
      });
    }

    const res = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AI_KEY}`,
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: messages || [
          { role: 'system', content: 'You are the HeatGuard Autonomous AI Agent. Be concise and helpful.' },
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    const text = await res.text();
    console.log(`[AI Agent] Response status: ${res.status}, body: ${text.substring(0, 200)}`);

    if (!res.ok) {
      console.error(`[AI Agent] API error: ${res.status} - ${text}`);
      return NextResponse.json({
        reply: `⚡ AI provider returned error ${res.status}. Please try again.`,
      });
    }

    const j = JSON.parse(text);
    const reply = j?.choices?.[0]?.message?.content || 'No response from AI.';

    return NextResponse.json({ reply });
  } catch (e: any) {
    console.error('[AI Agent] Exception:', e.message);
    return NextResponse.json({
      reply: `⚡ AI agent error: ${e.message}`,
    });
  }
}
