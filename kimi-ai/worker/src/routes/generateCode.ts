/**
 * Code Generation Route
 */

import { Context } from 'hono';

interface CodeGenerationRequest {
  prompt: string;
  language?: string;
  context?: string;
}

export async function generateCode(c: Context) {
  try {
    const body = await c.req.json<CodeGenerationRequest>();
    
    if (!body.prompt) {
      return c.json({ error: 'Prompt is required' }, 400);
    }

    const AI = c.env.AI as AiGateway;
    if (!AI) {
      return c.json({ error: 'AI service not available' }, 503);
    }

    // Build prompt
    let fullPrompt = `Generate clean, well-documented code based on the following requirements:\n\n${body.prompt}`;
    
    if (body.language) {
      fullPrompt += `\n\nLanguage: ${body.language}`;
    }
    
    if (body.context) {
      fullPrompt += `\n\nContext:\n${body.context}`;
    }
    
    fullPrompt += '\n\nReturn only the code without explanations or markdown formatting.';

    // Call AI model
    const response = await (AI as any).run('@cf/kimi/kimi2.6', {
      prompt: fullPrompt,
      max_tokens: 4096,
    });

    const code = (response as any).response || '';

    return c.json({
      success: true,
      data: {
        code: code.trim(),
        explanation: `Generated ${body.language || 'code'} based on requirements.`,
      },
    });
  } catch (error) {
    console.error('Error in generateCode:', error);
    const msg = error instanceof Error ? error.message : String(error);
    // If the Cloudflare AI model isn't available in this environment, return a local mock
    if (msg && msg.includes('No such model')) {
      const mockCode = `// Mocked response (model unavailable locally)\nfunction hello() {\n  return 'hello world';\n}`;
      return c.json({
        success: true,
        data: {
          code: mockCode,
          explanation: 'Mocked code response (local development)',
        },
      });
    }

    return c.json({
      error: 'Failed to generate code',
      message: msg || 'Unknown error',
    }, 500);
  }
}
