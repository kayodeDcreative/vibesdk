import { Message } from './common';
import { InferResponseString, InferResponseObject, InferError, AbortError, ToolCallContext } from './core';
import { z } from 'zod';
import { formatSchemaAsMarkdown } from './schemaFormatters';

export async function runWorkersAI(
    env: Env,
    model: string,
    messages: Message[],
    options: {
        maxTokens?: number;
        temperature?: number;
        stream?: {
            chunk_size: number;
            onChunk: (chunk: string) => void;
        };
        abortSignal?: AbortSignal;
    },
    toolCallContext?: ToolCallContext
): Promise<InferResponseString> {
    // Correctly handle model ID for moonshot-kimi-2-240516
    let modelName = model.startsWith('workers-ai/') ? model.replace('workers-ai/', '') : model;
    if (modelName === 'moonshot-kimi-2-240516') {
        modelName = 'moonshot/kimi-2-240516';
    }

    // Convert messages to Workers AI format
    const workersAiMessages = messages.map(msg => ({
        role: msg.role,
        content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
    }));

    if (toolCallContext?.messages) {
        workersAiMessages.push(...toolCallContext.messages.map(msg => ({
            role: msg.role as string,
            content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content)
        })));
    }

    try {
        if (options.stream) {
            const stream = await env.AI.run(`@cf/${modelName}` as any, {
                messages: workersAiMessages,
                stream: true,
                max_tokens: options.maxTokens,
                temperature: options.temperature,
            });

            if (!(stream instanceof ReadableStream)) {
                throw new Error('Expected ReadableStream from Workers AI');
            }

            let fullContent = '';
            let streamIndex = 0;
            const reader = stream.getReader();
            const decoder = new TextDecoder();
            let lineBuffer = '';

            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    lineBuffer += decoder.decode(value, { stream: true });
                    const lines = lineBuffer.split('\n');
                    lineBuffer = lines.pop() || '';

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const data = line.slice(6).trim();
                            if (data === '[DONE]') break;

                            try {
                                const parsed = JSON.parse(data);
                                const content = parsed.response || '';
                                fullContent += content;

                                if (fullContent.length - streamIndex >= options.stream.chunk_size) {
                                    options.stream.onChunk(fullContent.slice(streamIndex));
                                    streamIndex = fullContent.length;
                                }
                            } catch (e) {
                                console.error('Error parsing Workers AI stream chunk', e);
                            }
                        }
                    }
                }

                if (fullContent.length > streamIndex) {
                    options.stream.onChunk(fullContent.slice(streamIndex));
                }

                return { string: fullContent, toolCallContext };
            } finally {
                reader.releaseLock();
            }
        } else {
            const response = await env.AI.run(`@cf/${modelName}` as any, {
                messages: workersAiMessages,
                max_tokens: options.maxTokens,
                temperature: options.temperature,
            }) as any;

            const content = response.response || '';
            return { string: content, toolCallContext };
        }
    } catch (error) {
        if (error instanceof Error && (error.name === 'AbortError' || error.message?.includes('aborted'))) {
            throw new AbortError('**User cancelled inference**', toolCallContext);
        }
        console.error('Error in runWorkersAI:', error);
        throw error;
    }
}

export async function runWorkersAIStructured<OutputSchema extends z.AnyZodObject>(
    env: Env,
    model: string,
    messages: Message[],
    schema: OutputSchema,
    options: {
        maxTokens?: number;
        temperature?: number;
        abortSignal?: AbortSignal;
    },
    toolCallContext?: ToolCallContext
): Promise<InferResponseObject<OutputSchema>> {
    // Use the existing markdown schema formatter for structured output
    const markdownTemplate = formatSchemaAsMarkdown(schema as any);

    const messagesWithSchema = [...messages];
    const schemaPrompt = `\n\nIMPORTANT: Your response MUST follow this structured markdown format exactly:
${markdownTemplate}

Do not include any other text, explanations, or XML tags. Just the raw structured markdown.`;

    const lastMessage = messagesWithSchema[messagesWithSchema.length - 1];
    if (typeof lastMessage.content === 'string') {
        messagesWithSchema[messagesWithSchema.length - 1] = {
            ...lastMessage,
            content: lastMessage.content + schemaPrompt
        };
    }

    const result = await runWorkersAI(env, model, messagesWithSchema, options, toolCallContext);

    try {
        // Use the existing markdown parser
        const { parseMarkdownContent } = await import('./schemaFormatters');
        const parsed = parseMarkdownContent(result.string, schema, { debug: false });
        return { object: parsed, toolCallContext: result.toolCallContext };
    } catch (error) {
        console.error('Failed to parse Workers AI structured output:', error);
        throw new InferError('Failed to parse response', result.string, toolCallContext);
    }
}
