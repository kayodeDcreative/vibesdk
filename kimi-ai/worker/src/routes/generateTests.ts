/**
 * Test Generation Route
 */

import { Context } from 'hono';

interface TestGenerationRequest {
  code: string;
  language?: string;
}

export async function generateTests(c: Context) {
  try {
    const body = await c.req.json<TestGenerationRequest>();
    
    if (!body.code) {
      return c.json({ error: 'Code is required' }, 400);
    }

    const AI = c.env.AI as AiGateway;
    if (!AI) {
      return c.json({ error: 'AI service not available' }, 503);
    }

    const prompt = `Generate comprehensive unit tests for the following ${body.language || ''} code. Return only the test code without explanations:\n\n${body.code}`;

    const response = await (AI as any).run('@cf/kimi/kimi2.6', {
      prompt,
      max_tokens: 4096,
    });

    const testCode = (response as any).response || '';

    return c.json({
      success: true,
      data: {
        tests: testCode.trim(),
        coverage: 'Unit tests generated for provided code.',
      },
    });
  } catch (error) {
    console.error('Error in generateTests:', error);
    return c.json({
      error: 'Failed to generate tests',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
}
