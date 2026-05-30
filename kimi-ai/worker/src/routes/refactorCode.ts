/**
 * Code Refactoring Route
 */

import { Context } from 'hono';

interface CodeRefactoringRequest {
  code: string;
  language?: string;
}

export async function refactorCode(c: Context) {
  try {
    const body = await c.req.json<CodeRefactoringRequest>();
    
    if (!body.code) {
      return c.json({ error: 'Code is required' }, 400);
    }

    const AI = c.env.AI as AiGateway;
    if (!AI) {
      return c.json({ error: 'AI service not available' }, 503);
    }

    const prompt = `Please refactor the following ${body.language || ''} code to improve readability, performance, and maintainability. Return only the refactored code without explanations:\n\n${body.code}`;

    const response = await (AI as any).run('@cf/moonshotai/kimi-k2.6', {
      prompt,
      max_tokens: 4096,
    });

    const refactoredCode = (response as any).response || '';
    const thinking = (response as any).thinking || (response as any).reasoning || undefined;

    return c.json({
      success: true,
      data: {
        code: refactoredCode.trim(),
        thinking: thinking,
        suggestions: `Refactored ${body.language || ''} code for improved quality.`,
      },
    });
  } catch (error) {
    console.error('Error in refactorCode:', error);
    return c.json({
      error: 'Failed to refactor code',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
}
