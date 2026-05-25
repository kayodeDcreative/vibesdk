/**
 * Code Explanation Route
 */

import { Context } from 'hono';

interface CodeExplanationRequest {
  code: string;
}

export async function explainCode(c: Context) {
  try {
    const body = await c.req.json<CodeExplanationRequest>();
    
    if (!body.code) {
      return c.json({ error: 'Code is required' }, 400);
    }

    const AI = c.env.AI as AiGateway;
    if (!AI) {
      return c.json({ error: 'AI service not available' }, 503);
    }

    const prompt = `Please provide a detailed explanation of the following code:\n\n${body.code}\n\nExplain what it does, any key functions, and important patterns.`;

    const response = await (AI as any).run('@cf/kimi/kimi2.6', {
      prompt,
      max_tokens: 2048,
    });

    const explanation = (response as any).response || '';

    return c.json({
      success: true,
      data: {
        explanation: explanation.trim(),
      },
    });
  } catch (error) {
    console.error('Error in explainCode:', error);
    return c.json({
      error: 'Failed to explain code',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
}
