/**
 * AI Controller Types
 */

export interface CodeGenerationRequest {
  prompt: string;
  language?: string;
  context?: string;
}

export interface CodeGenerationResponse {
  code: string;
  explanation?: string;
}

export interface CodeExplanationRequest {
  code: string;
}

export interface CodeExplanationResponse {
  explanation: string;
}

export interface CodeRefactoringRequest {
  code: string;
  language?: string;
}

export interface CodeRefactoringResponse {
  code: string;
  suggestions?: string;
}

export interface TestGenerationRequest {
  code: string;
  language?: string;
}

export interface TestGenerationResponse {
  tests: string;
  coverage?: string;
}

export type GenerateCodeData = CodeGenerationResponse;
export type ExplainCodeData = CodeExplanationResponse;
export type RefactorCodeData = CodeRefactoringResponse;
export type GenerateTestsData = TestGenerationResponse;
