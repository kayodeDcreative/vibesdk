/**
 * Chat Completions Route - OpenAI-compatible Chat Completions API
 * This endpoint is compatible with VS Code's Custom Endpoint language model integration
 */

import { Context } from 'hono';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatCompletionRequest {
  model?: string;
  messages: ChatMessage[];
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  n?: number;
  stop?: string | string[];
  functions?: Array<{ name: string; description?: string; parameters?: any }>;
  function_call?: 'none' | 'auto' | { name: string };
  stream?: boolean;
}

interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: 'assistant';
      content: string;
      tool_calls?: Array<{
        id: string;
        type: 'function';
        function: {
          name: string;
          arguments: string;
        };
      }>;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export async function chatCompletionsHandler(c: Context) {
  try {
    console.log('chatCompletionsHandler called');
    console.log('Method:', c.req.method);
    console.log('Content-Type:', c.req.header('content-type'));
    console.log('Authorization:', c.req.header('authorization') ? 'present' : 'missing');
    
    const body = await c.req.json<ChatCompletionRequest>();
    console.log('Body:', JSON.stringify(body).substring(0, 200));
    
    if (!body || !Array.isArray(body.messages) || body.messages.length === 0) {
      return c.json({ error: 'messages array is required' }, 400);
    }

    const AI = c.env.AI as AiGateway;
    if (!AI) return c.json({ error: 'AI service not available' }, 503);

    const workersAiMessages = body.messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const requestedModel = (body.model || '@cf/moonshotai/kimi-k2.6').toString();
    const normalizedModel = requestedModel.trim().toLowerCase();

    // Allow friendly aliases for models coming from VS Code or other clients.
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

    // Call Cloudflare Workers AI with chat message format.
    const acceptHeader = c.req.header('accept') || '';
    const streamMode = body.stream === true;
    console.log('Accept:', acceptHeader, 'stream:', body.stream, 'streamMode:', streamMode);

    const aiRequestOptions: Record<string, unknown> = {
      messages: workersAiMessages,
      max_tokens: body.max_tokens || 1024,
      temperature: body.temperature,
      top_p: body.top_p,
      n: body.n,
      stop: body.stop,
      functions: body.functions,
      function_call: body.function_call,
    };

    let response: any;

    try {
      if (streamMode) {
        console.warn('Stream requested; handling as non-stream to normalize tool calls');
      }

      response = await (AI as any).run(modelId, aiRequestOptions);
    } catch (err) {
      console.error('AI.run() error:', err);
      if (err && (err as any).message && /(No such model|No such task)/i.test((err as any).message)) {
        (err as any).message = `Model not found: ${modelId} - ${(err as any).message}`;
      }
      throw err;
    }

    // ----- NORMALIZE Cloudflare Workers AI response into OpenAI-like schema -----
    const normalizeText = (resp: any) => {
      if (!resp) return '';
      if (typeof resp === 'string') return resp;
      if (typeof resp.response === 'string') return resp.response;
      if (typeof resp.result?.response === 'string') return resp.result.response;
      if (typeof resp.content === 'string') return resp.content;
      if (Array.isArray(resp.choices) && resp.choices[0]) {
        const m = resp.choices[0].message || resp.choices[0];
        if (m && typeof m.content === 'string') return m.content;
        if (typeof resp.choices[0].text === 'string') return resp.choices[0].text;
      }
      return '';
    };

    // Remove raw XML-like tool blocks that Moonshot sometimes injects into the text
    const cleanRawToolBlocks = (rawText: string) => {
      if (!rawText || typeof rawText !== 'string') return rawText || '';

      // Only attempt heavy cleaning if we detect likely tool tokens
      const indicators = ['<tool', '<function_call', '<function', 'functions.', 'tool_calls'];
      const shouldClean = indicators.some((i) => rawText.includes(i));
      if (!shouldClean) return rawText;

      // Remove matching paired tags like <tool ...>...</tool> and <function_call ...>...</function_call>
      let cleaned = rawText.replace(/<([a-zA-Z0-9_-]+)[^>]*>[\s\S]*?<\/\1>/g, '');
      // Remove self-closing tags like <tool .../> if present
      cleaned = cleaned.replace(/<([a-zA-Z0-9_-]+)[^>]*\/>/g, '');
      return cleaned;
    };

    const extractToolCalls = (resp: any) => {
      if (!resp) return undefined;

      // Direct Cloudflare shape: resp.tool_calls or resp.result.tool_calls
      const raw = resp.tool_calls || resp.result?.tool_calls || resp.toolCalls || undefined;
      if (Array.isArray(raw) && raw.length > 0) {
        return raw.map((tc: any) => {
          const name = tc.name || tc.function?.name || tc.function_name || tc.id || 'unnamed_tool';
          const args = tc.arguments ?? tc.function?.arguments ?? tc.args ?? tc.payload ?? tc.body ?? '';
          return {
            id: tc.id || `tool-${name}-${Date.now()}`,
            type: 'function' as const,
            function: {
              name,
              arguments: typeof args === 'string' ? args : JSON.stringify(args),
            },
          };
        });
      }

      // OpenAI-style function_call inside choices[0].message
      if (Array.isArray(resp.choices) && resp.choices[0]?.message) {
        const m = resp.choices[0].message as any;
        if (Array.isArray(m.tool_calls) && m.tool_calls.length > 0) return m.tool_calls;
        const fc = m.function_call || resp.choices[0].function_call;
        if (fc?.name) {
          return [{
            id: `tool-${fc.name}-${Date.now()}`,
            type: 'function' as const,
            function: {
              name: fc.name,
              arguments: typeof fc.arguments === 'string' ? fc.arguments : JSON.stringify(fc.arguments ?? ''),
            },
          }];
        }
      }

      // Fallback: if resp.function_call exists at root
      const fcRoot = resp.function_call || resp.functionCall;
      if (fcRoot?.name) {
        return [{
          id: `tool-${fcRoot.name}-${Date.now()}`,
          type: 'function' as const,
          function: {
            name: fcRoot.name,
            arguments: typeof fcRoot.arguments === 'string' ? fcRoot.arguments : JSON.stringify(fcRoot.arguments ?? ''),
          },
        }];
      }

      return undefined;
    };

    // Normalize text then strip any embedded raw tool blocks
    const rawText = normalizeText(response);
    const text = cleanRawToolBlocks(rawText).trim();
    let toolCalls = extractToolCalls(response);

    // If no structured tool calls found, try to parse them from the raw text
    if ((!toolCalls || toolCalls.length === 0) && rawText) {
      const parsed: any[] = [];

      // Match patterns like <tool name="name">...json...</tool>
      const toolRe = /<tool\s+name=["']([^"']+)["'][^>]*>([\s\S]*?)<\/tool>/gi;
      let m: RegExpExecArray | null;
      while ((m = toolRe.exec(rawText))) {
        const name = m[1];
        const args = (m[2] || '').trim();
        parsed.push({
          id: `tool-${name}-${Date.now()}`,
          type: 'function',
          function: { name, arguments: args || '' },
        });
      }

      // Match <function_call name="...">...json...</function_call>
      const fcRe = /<function_call\s+name=["']([^"']+)["'][^>]*>([\s\S]*?)<\/function_call>/gi;
      while ((m = fcRe.exec(rawText))) {
        const name = m[1];
        const args = (m[2] || '').trim();
        parsed.push({
          id: `tool-${name}-${Date.now()}`,
          type: 'function',
          function: { name, arguments: args || '' },
        });
      }

      if (parsed.length) toolCalls = parsed;
    }

    // Rough token estimation
    const promptTokens = Math.ceil(
      workersAiMessages.reduce((sum, msg) => sum + (msg.content ? msg.content.length : 0), 0) / 4
    );
    const completionTokens = Math.ceil((text || '').length / 4);

    const completionResponse: ChatCompletionResponse = {
      id: `chatcmpl-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: modelId,
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: text,
            ...(toolCalls ? { tool_calls: toolCalls } : {}),
          },
          finish_reason: toolCalls?.length ? 'tool_calls' : 'stop',
        },
      ],
      usage: {
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: promptTokens + completionTokens,
      },
    };

    // Defensive: ensure we always return at least one choice and non-null content
    if (!Array.isArray(completionResponse.choices) || completionResponse.choices.length === 0) {
      completionResponse.choices = [
        {
          index: 0,
          message: { role: 'assistant', content: '' },
          finish_reason: 'stop',
        },
      ];
    }
    if (completionResponse.choices[0].message.content == null) {
      completionResponse.choices[0].message.content = '';
    }

    // Log the final payload to help diagnose "no choices" errors in clients
    try {
      console.log('Final completionResponse:', JSON.stringify(completionResponse).substring(0, 2000));
    } catch (e) {
      console.warn('Could not stringify completionResponse for logging', e);
    }

    if (streamMode) {
      console.warn('Client requested stream; returning a single SSE event with normalized JSON');
      const ssePayload = `data: ${JSON.stringify(completionResponse)}\n\n` + `data: [DONE]\n\n`;
      return new Response(ssePayload, {
        headers: { 'content-type': 'text/event-stream' },
      });
    }

    return c.json(completionResponse);
  } catch (err) {
    console.error('Error in chatCompletionsHandler:', err);
    const msg = err instanceof Error ? err.message : String(err);
    return c.json(
      { error: 'chat completion failed', message: msg || 'Unknown error' },
      500
    );
  }
}
