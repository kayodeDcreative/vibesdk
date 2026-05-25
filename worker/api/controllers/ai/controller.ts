import { BaseController } from '../baseController';
import type { ControllerResponse } from '../types';
import type { RouteContext } from '../../types/route-context';
import type {
  CodeGenerationRequest,
  GenerateCodeData,
  ExplainCodeData,
  RefactorCodeData,
  GenerateTestsData,
} from './types';
import { createLogger } from '../../logger';

const logger = createLogger('AIController');

export class AIController extends BaseController {
  /**
   * Generate code using Cloudflare Workers AI
   */
  static async generateCode(
    request: Request,
    env: Env,
    _ctx: ExecutionContext,
    _context: RouteContext
  ): Promise<ControllerResponse<GenerateCodeData>> {
    try {
      const body = await AIController.parseJsonBody<CodeGenerationRequest>(request);
      if (!body.success || !body.data) {
        return AIController.createErrorResponse('Invalid request body', 400);
      }

      const { prompt, language, context } = body.data;

      if (!prompt) {
        return AIController.createErrorResponse('Prompt is required', 400);
      }

      if (!env.AI) {
        logger.error('AI binding not available');
        return AIController.createErrorResponse('AI service not available', 503);
      }

      // Build the prompt for code generation
      let fullPrompt = `Generate clean, well-documented code based on the following requirements:\n\n${prompt}`;

      if (language) {
        fullPrompt += `\n\nLanguage: ${language}`;
      }

      if (context) {
        fullPrompt += `\n\nContext:\n${context}`;
      }

      fullPrompt += '\n\nReturn only the code without explanations or markdown formatting.';

      // Call Workers AI
      const response = await (env.AI as any).run('@cf/kimi/kimi2.6', {
        prompt: fullPrompt,
        max_tokens: 4096,
      });

      const code = (response as any).response || '';

      return AIController.createSuccessResponse({
        code: code.trim(),
        explanation: `Generated ${language || 'code'} based on requirements.`,
      });
    } catch (error) {
      logger.error('Error generating code:', { error });
      return AIController.createErrorResponse(
        error instanceof Error ? error.message : 'Failed to generate code',
        500
      );
    }
  }

  /**
   * Explain selected code
   */
  static async explainCode(
    request: Request,
    _env: Env,
    _ctx: ExecutionContext,
    _context: RouteContext
  ): Promise<ControllerResponse<ExplainCodeData>> {
    try {
      const body = await AIController.parseJsonBody<{ code: string }>(request);
      if (!body.success || !body.data?.code) {
        return AIController.createErrorResponse('Code is required', 400);
      }

      const { code } = body.data;

      if (!_env.AI) {
        logger.error('AI binding not available');
        return AIController.createErrorResponse('AI service not available', 503);
      }

      const prompt = `Please provide a detailed explanation of the following code:\n\n${code}\n\nExplain what it does, any key functions, and important patterns.`;

      const response = await (_env.AI as any).run('@cf/kimi/kimi2.6', {
        prompt,
        max_tokens: 2048,
      });

      const explanation = (response as any).response || '';

      return AIController.createSuccessResponse({
        explanation: explanation.trim(),
      });
    } catch (error) {
      logger.error('Error explaining code:', { error });
      return AIController.createErrorResponse(
        error instanceof Error ? error.message : 'Failed to explain code',
        500
      );
    }
  }

  /**
   * Refactor code
   */
  static async refactorCode(
    request: Request,
    env: Env,
    _ctx: ExecutionContext,
    _context: RouteContext
  ): Promise<ControllerResponse<RefactorCodeData>> {
    try {
      const body = await AIController.parseJsonBody<{ code: string; language?: string }>(request);
      if (!body.success || !body.data?.code) {
        return AIController.createErrorResponse('Code is required', 400);
      }

      const { code, language } = body.data;

      if (!env.AI) {
        logger.error('AI binding not available');
        return AIController.createErrorResponse('AI service not available', 503);
      }

      const prompt = `Please refactor the following ${language || ''} code to improve readability, performance, and maintainability. Return only the refactored code without explanations:\n\n${code}`;

      const response = await (env.AI as any).run('@cf/kimi/kimi2.6', {
        prompt,
        max_tokens: 4096,
      });

      const refactoredCode = (response as any).response || '';

      return AIController.createSuccessResponse({
        code: refactoredCode.trim(),
        suggestions: `Refactored ${language || ''} code for improved quality.`,
      });
    } catch (error) {
      logger.error('Error refactoring code:', { error });
      return AIController.createErrorResponse(
        error instanceof Error ? error.message : 'Failed to refactor code',
        500
      );
    }
  }

  /**
   * Generate tests for code
   */
  static async generateTests(
    request: Request,
    env: Env,
    _ctx: ExecutionContext,
    _context: RouteContext
  ): Promise<ControllerResponse<GenerateTestsData>> {
    try {
      const body = await AIController.parseJsonBody<{ code: string; language?: string }>(request);
      if (!body.success || !body.data?.code) {
        return AIController.createErrorResponse('Code is required', 400);
      }

      const { code, language } = body.data;

      if (!env.AI) {
        logger.error('AI binding not available');
        return AIController.createErrorResponse('AI service not available', 503);
      }

      const prompt = `Generate comprehensive unit tests for the following ${language || ''} code. Return only the test code without explanations:\n\n${code}`;

      const response = await (env.AI as any).run('@cf/kimi/kimi2.6', {
        prompt,
        max_tokens: 4096,
      });

      const testCode = (response as any).response || '';

      return AIController.createSuccessResponse({
        tests: testCode.trim(),
        coverage: 'Unit tests generated for provided code.',
      });
    } catch (error) {
      logger.error('Error generating tests:', { error });
      return AIController.createErrorResponse(
        error instanceof Error ? error.message : 'Failed to generate tests',
        500
      );
    }
  }
}
