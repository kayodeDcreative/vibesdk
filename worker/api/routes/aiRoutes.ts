import { Hono } from 'hono';
import { AIController } from '../controllers/ai/controller';
import { adaptController } from '../honoAdapter';
import { AppEnv } from '../../types/appenv';
import { AuthConfig, setAuthLevel } from '../../middleware/auth/routeAuth';

export function setupAIRoutes(app: Hono<AppEnv>): void {
  const aiRouter = new Hono<AppEnv>();

  // Code generation endpoint
  aiRouter.post(
    '/generate-code',
    setAuthLevel(AuthConfig.public),
    adaptController(AIController, AIController.generateCode)
  );

  // Code explanation endpoint
  aiRouter.post(
    '/explain-code',
    setAuthLevel(AuthConfig.public),
    adaptController(AIController, AIController.explainCode)
  );

  // Code refactoring endpoint
  aiRouter.post(
    '/refactor-code',
    setAuthLevel(AuthConfig.public),
    adaptController(AIController, AIController.refactorCode)
  );

  // Test generation endpoint
  aiRouter.post(
    '/generate-tests',
    setAuthLevel(AuthConfig.public),
    adaptController(AIController, AIController.generateTests)
  );

  app.route('/api/ai', aiRouter);
}
