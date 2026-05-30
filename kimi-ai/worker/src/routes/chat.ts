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

    const promptParts: string[] = [
      'You are a skilled developer assistant. Answer clearly, help with code-related problems, and do not invent unsupported behavior.',
    ];

    for (const m of body.messages) {
      const role = m.role === 'assistant' ? 'Assistant' : m.role === 'system' ? 'System' : 'User';
      promptParts.push(`${role}: ${m.content}`);
    }

    const fullPrompt = promptParts.join('\n') + '\nAssistant:';

    const requestedModel = (body.model || '@cf/moonshotai/kimi-k2.6').toString();
    const normalizedModel = requestedModel.trim().toLowerCase();
    const modelAliases: Record<string, string> = {
      'kimi-ai': '@cf/moonshotai/kimi-k2.6',
      'kimi': '@cf/moonshotai/kimi-k2.6',
      'kimi k2.6': '@cf/moonshotai/kimi-k2.6',
      'kimi-k2.6': '@cf/moonshotai/kimi-k2.6',
      'kimi.k2.6': '@cf/moonshotai/kimi-k2.6',
      'kimi moonshot': '@cf/moonshotai/kimi-k2.6',
      'kimi-moonshot': '@cf/moonshotai/kimi-k2.6',
      'moonshot': '@cf/moonshotai/kimi-k2.6',
      'moonshotai': '@cf/moonshotai/kimi-k2.6',
      'default': '@cf/moonshotai/kimi-k2.6',
    };
    const modelId = modelAliases[normalizedModel] || requestedModel;
    const reqUrl = new URL(c.req.url);
    const acceptHeader = c.req.header('accept') || '';
    const streamMode = reqUrl.searchParams.get('stream') === '1' || (acceptHeader || '').includes('text/event-stream');
    const affinity = (body as any).affinity || c.req.header('x-session-affinity');

    if (streamMode) {
      try {
        const stream = await (AI as any).run(modelId, {
          prompt: fullPrompt,
          stream: true,
          max_tokens: body.max_tokens || 1024,
        }, affinity ? { headers: { 'x-session-affinity': affinity } } : undefined);

        return new Response(stream as any, { headers: { 'content-type': 'text/event-stream' } });
      } catch (err) {
        console.error('Streaming error in chatHandler:', err);
        return c.json({ error: 'Streaming failed', message: err instanceof Error ? err.message : String(err) }, 500);
      }
    }

    const response = await (AI as any).run(modelId, {
      prompt: fullPrompt,
      max_tokens: body.max_tokens || 1024,
    });

    const text = (response as any).response || '';
    const thinking = (response as any).thinking || (response as any).reasoning || undefined;

    return c.json({ success: true, data: { reply: text.trim(), thinking: thinking } });
  } catch (err) {
    console.error('Error in chatHandler:', err);
    const msg = err instanceof Error ? err.message : String(err);
    if (msg && msg.includes('No such model')) {
      return c.json({ success: true, data: { reply: "I'm a local mock assistant. I can't access the real model right now." } });
    }
    return c.json({ error: 'Chat failed', message: msg || 'Unknown error' }, 500);
  }
}
