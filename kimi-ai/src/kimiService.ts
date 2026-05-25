import axios, { AxiosInstance } from 'axios';
import * as vscode from 'vscode';

export interface KimiCodeGenerationRequest {
  prompt: string;
  language?: string;
  context?: string;
}

export interface KimiCodeGenerationResponse {
  code: string;
  explanation?: string;
}

export class KimiService {
  private client: AxiosInstance;
  private workerUrl: string;

  constructor() {
    const config = vscode.workspace.getConfiguration('kimi-ai');
    this.workerUrl = config.get('cloudflareWorkerUrl') || 
      config.get('aiEndpoint') ||
      'https://vibesdk.example.workers.dev';

    this.client = axios.create({
      baseURL: this.workerUrl,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 60000, // Increase timeout for AI operations
    });
  }

  /**
   * Generate code using Cloudflare Workers AI
   */
  async generateCode(request: KimiCodeGenerationRequest): Promise<KimiCodeGenerationResponse> {
    if (!this.workerUrl) {
      throw new Error('AI Worker endpoint not configured. Please set it in VS Code settings.');
    }

    try {
      const response = await this.client.post('/api/ai/generate-code', {
        prompt: request.prompt,
        language: request.language,
        context: request.context,
      });

      const data = response.data?.data || response.data;
      
      return {
        code: data.code || '',
        explanation: data.explanation || 'Code generated successfully',
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorMsg = error.response?.data?.error || error.response?.data?.message || error.message;
        throw new Error(`AI Service Error: ${error.response?.status} - ${errorMsg}`);
      }
      throw error;
    }
  }

  /**
   * Generate a detailed explanation for code
   */
  async explainCode(code: string): Promise<string> {
    if (!this.workerUrl) {
      throw new Error('AI Worker endpoint not configured.');
    }

    try {
      const response = await this.client.post('/api/ai/explain-code', {
        code,
      });

      const data = response.data?.data || response.data;
      return data.explanation || 'Code analysis complete';
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorMsg = error.response?.data?.error || error.response?.data?.message || error.message;
        throw new Error(`AI Service Error: ${error.response?.status} - ${errorMsg}`);
      }
      throw error;
    }
  }

  /**
   * Refactor code using AI
   */
  async refactorCode(code: string, language?: string): Promise<string> {
    if (!this.workerUrl) {
      throw new Error('AI Worker endpoint not configured.');
    }

    try {
      const response = await this.client.post('/api/ai/refactor-code', {
        code,
        language,
      });

      const data = response.data?.data || response.data;
      return data.code || code;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorMsg = error.response?.data?.error || error.response?.data?.message || error.message;
        throw new Error(`AI Service Error: ${error.response?.status} - ${errorMsg}`);
      }
      throw error;
    }
  }

  /**
   * Generate test cases for code
   */
  async generateTests(code: string, language?: string): Promise<string> {
    if (!this.workerUrl) {
      throw new Error('AI Worker endpoint not configured.');
    }

    try {
      const response = await this.client.post('/api/ai/generate-tests', {
        code,
        language,
      });

      const data = response.data?.data || response.data;
      return data.tests || code;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const errorMsg = error.response?.data?.error || error.response?.data?.message || error.message;
        throw new Error(`AI Service Error: ${error.response?.status} - ${errorMsg}`);
      }
      throw error;
    }
  }

  /**
   * Test the API connection
   */
  async testConnection(): Promise<boolean> {
    if (!this.workerUrl) {
      throw new Error('AI Worker endpoint not configured.');
    }

    try {
      const response = await this.client.post('/api/ai/generate-code', {
        prompt: 'return "hello world"',
        language: 'JavaScript',
      });

      return !!response.data?.data?.code;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Connection failed: ${error.response?.status} - ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Update AI endpoint
   */
  updateEndpoint(endpoint: string): void {
    this.workerUrl = endpoint;
    this.client.defaults.baseURL = endpoint;
  }
}
