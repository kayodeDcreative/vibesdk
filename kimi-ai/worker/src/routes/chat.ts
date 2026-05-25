/**
 * Chat Route - accept message arrays and return assistant reply
 */

import { Context } from 'hono';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  model?: string;
  max_tokens?: number;
}

export async function chatHandler(c: Context) {
  try {
    const body = await c.req.json<ChatRequest>();
    if (!body || !Array.isArray(body.messages) || body.messages.length === 0) {
      return c.json({ error: 'messages array is required' }, 400);
    }

    const AI = c.env.AI as AiGateway;
    if (!AI) return c.json({ error: 'AI service not available' }, 503);

    // Build conversational prompt by concatenating messages
    const promptParts: string[] = [];
    for (const m of body.messages) {
      promptParts.push(`${m.role.toUpperCase()}: ${m.content}`);
    }
    const fullPrompt = promptParts.join('\n') + '\nASSISTANT:';

    const model = body.model || '@cf/kimi/kimi2.6';

    const response = await (AI as any).run(model, {
      prompt: fullPrompt,
      max_tokens: body.max_tokens || 1024,
    });

    const text = (response as any).response || '';

    return c.json({ success: true, data: { reply: text.trim() } });
  } catch (err) {
    console.error('Error in chatHandler:', err);
    const msg = err instanceof Error ? err.message : String(err);
    if (msg && msg.includes('No such model')) {
      return c.json({ success: true, data: { reply: "I'm a local mock assistant. I can't access the real model right now." } });
    }
    return c.json({ error: 'Chat failed', message: msg || 'Unknown error' }, 500);
  }
}
