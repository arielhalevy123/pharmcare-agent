import OpenAI from 'openai';
import { toolDefinitions } from '../tools/toolDefinitions';
import { executeTool } from '../tools/toolExecutor';
import { logger } from '../utils/logger';
import { SAFETY_SYSTEM_PROMPT } from '../prompts/systemPrompt';
import { isMedicalAdvice, SAFETY_REDIRECT_REASON } from './safety';

export class PharmacyAgent {
  private openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
  }

  async processMessage(
    userMessage: string,
    userId: number,
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []
  ): Promise<AsyncGenerator<{ type: 'text' | 'tool_call' | 'tool_result'; data: any }, void, unknown>> {
    const timestamp = new Date().toISOString();
    logger.log(`[${timestamp}] Processing message from user ${userId}`, { message: userMessage });

    // Check for safety violations before processing
    if (isMedicalAdvice(userMessage)) {
      logger.log(`[${timestamp}] Safety redirect triggered`, { reason: SAFETY_REDIRECT_REASON });
      return this.streamRedirectMessage(SAFETY_REDIRECT_REASON);
    }

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: SAFETY_SYSTEM_PROMPT },
      ...conversationHistory,
      { role: 'user', content: userMessage },
    ];

    return this.streamWithFunctionCalling(messages, userId);
  }

  private async *streamRedirectMessage(reason: string): AsyncGenerator<{ type: 'text' | 'tool_call' | 'tool_result'; data: any }, void, unknown> {
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: SAFETY_SYSTEM_PROMPT,
      },
      {
        role: 'user',
        content: `The user asked something that requires medical advice. Please redirect them politely to a healthcare professional. Reason: ${reason}`,
      },
    ];

    const stream = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: messages,
      stream: true,
      temperature: 0.7,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield { type: 'text', data: content };
      }
    }
  }

  private async *streamWithFunctionCalling(
    messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
    userId: number
  ): AsyncGenerator<{ type: 'text' | 'tool_call' | 'tool_result'; data: any }, void, unknown> {
    let maxIterations = 10; // Prevent infinite loops
    let iteration = 0;

    while (iteration < maxIterations) {
      iteration++;
      const timestamp = new Date().toISOString();
      logger.log(`[${timestamp}] Agent iteration ${iteration}`, { userId });

      const stream = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: messages,
        tools: toolDefinitions,
        tool_choice: 'auto',
        stream: true,
        temperature: 0.4,
      });

      let functionCall: { name: string; arguments: string; id?: string } | null = null;
      let accumulatedContent = '';
      let toolCallId = ''; // Reset for each iteration - tracks current tool call ID within this iteration

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;

        // Handle function calls
        if (delta?.tool_calls) {
          for (const toolCall of delta.tool_calls) {
            const chunkToolCallId = toolCall.id;
            const currentToolCallId = chunkToolCallId || toolCallId;
            
            if (toolCall.id) {
              toolCallId = toolCall.id;
            }

            if (toolCall.function) {
              if (!functionCall) {
                // Use the toolCall.id directly, or toolCallId if id not present in this chunk
                functionCall = {
                  name: toolCall.function.name || '',
                  arguments: toolCall.function.arguments || '',
                  id: currentToolCallId,
                };

                // Emit tool call start event
                yield {
                  type: 'tool_call',
                  data: {
                    name: functionCall.name,
                    arguments: functionCall.arguments,
                    timestamp: new Date().toISOString(),
                  },
                };
              } else {
                // Only append arguments if the tool call ID matches (same tool call continuing)
                // If IDs don't match, this is a different tool call - ignore it for now
                // (The current design supports only one tool call per iteration)
                if (functionCall.id === currentToolCallId) {
                  functionCall.arguments += toolCall.function.arguments || '';

                  // Update tool call arguments
                  yield {
                    type: 'tool_call',
                    data: {
                      name: functionCall.name,
                      arguments: functionCall.arguments,
                      timestamp: new Date().toISOString(),
                    },
                  };
                }
              }
            }
          }
        }

        // Handle text content
        const content = delta?.content;
        if (content) {
          accumulatedContent += content;
          yield { type: 'text', data: content };
        }
      }

      // If there's a function call, execute it
      if (functionCall && functionCall.name) {
        // Parse the arguments first - never concatenate JSON strings
        let parsedArgs: any;
        try {
          parsedArgs = JSON.parse(functionCall.arguments);
        } catch (e) {
          logger.error(`[${timestamp}] Failed to parse function arguments`, {
            rawArguments: functionCall.arguments,
            error: e,
          });
          break;
        }

        // Build final arguments object by merging parsed args with any additional params
        // Use object spread to ensure we always have a single valid JSON object
        let finalArgs: any = { ...parsedArgs };

        // Inject userId if needed
        if (functionCall.name === 'checkPrescription' && !finalArgs.userId) {
          finalArgs = { ...finalArgs, userId };
        }

        // Log with the final merged arguments object (valid JSON)
        logger.log(`[${timestamp}] Executing function: ${functionCall.name}`, {
          arguments: finalArgs,
        });

        const toolResult = await executeTool(functionCall.name, finalArgs);

        // Emit tool result
        yield {
          type: 'tool_result',
          data: {
            name: functionCall.name,
            result: toolResult,
            timestamp: new Date().toISOString(),
          },
        };

        // Add function result to messages
        messages.push({
          role: 'assistant',
          content: null,
          tool_calls: [
            {
              id: toolCallId || `call_${Date.now()}`,
              type: 'function',
              function: {
                name: functionCall.name,
                arguments: functionCall.arguments,
              },
            },
          ],
        } as any);

        messages.push({
          role: 'tool',
          tool_call_id: toolCallId || `call_${Date.now()}`,
          content: JSON.stringify(toolResult),
        } as any);

        // Continue the loop to get the next response
        continue;
      } else {
        // No function call, we're done
        break;
      }
    }

    if (iteration >= maxIterations) {
      logger.error('Max iterations reached in agent processing');
      yield {
        type: 'text',
        data: '\n\n[System: Maximum processing iterations reached. Please try rephrasing your question.]',
      };
    }
  }
}

