/**
 * Code Generation Route - Using Cloudflare Workers AI
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

    const language = body.language || 'JavaScript';
    
    const systemPrompt = `You are an expert code generator. Generate clean, production-ready code.
Return ONLY the source code with no markdown, no backticks, no explanations.
Language: ${language}`;

    const userPrompt = `${body.prompt}${body.context ? `\n\nContext:\n${body.context}` : ''}`;

    // Use a fast, reliable Cloudflare AI model
    const modelId = '@cf/mistral/mistral-7b-instruct-v0.1';

    try {
      const response = await (AI as any).run(modelId, {
        prompt: `${systemPrompt}\n\nUser request: ${userPrompt}`,
        max_tokens: 2048,
      });

      let code = '';
      if (typeof response === 'string') {
        code = response;
      } else if (response && typeof response === 'object') {
        code = (response as any).response || 
               (response as any).text || 
               (response as any).content || 
               JSON.stringify(response);
      }

      return c.json({
        success: true,
        data: {
          code: code.trim(),
          explanation: `Generated ${language} code based on your requirements.`,
          model: modelId,
        },
      });
    } catch (aiError) {
      console.error('Mistral model error:', aiError);
      
      // Fallback to alternative model
      try {
        const fallbackModel = '@cf/openchat/openchat-3.5';
        const fallbackResponse = await (AI as any).run(fallbackModel, {
          prompt: `Generate ${language} code for: ${body.prompt}`,
          max_tokens: 2048,
        });

        let code = '';
        if (typeof fallbackResponse === 'string') {
          code = fallbackResponse;
        } else if (fallbackResponse && typeof fallbackResponse === 'object') {
          code = (fallbackResponse as any).response || 
                 (fallbackResponse as any).text || 
                 (fallbackResponse as any).content || 
                 JSON.stringify(fallbackResponse);
        }

        return c.json({
          success: true,
          data: {
            code: code.trim(),
            explanation: `Generated ${language} code based on your requirements.`,
            model: fallbackModel,
          },
        });
      } catch (fallbackError) {
        console.error('Fallback model error:', fallbackError);
        throw fallbackError;
      }
    }
  } catch (error) {
    console.error('Error in generateCode:', error);
    const msg = error instanceof Error ? error.message : String(error);
    
    return c.json({
      success: false,
      error: 'Code generation failed',
      message: msg,
    }, 500);
  }
}
