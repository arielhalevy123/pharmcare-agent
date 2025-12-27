import OpenAI from 'openai';
import { toolDefinitions } from '../tools/toolDefinitions';
import { executeTool } from '../tools/toolExecutor';
import { logger } from '../utils/logger';

const SAFETY_SYSTEM_PROMPT = `You are a professional pharmacy assistant AI. Your role is to provide factual medication information only.

CRITICAL SAFETY RULES:
1. NEVER provide medical diagnosis or suggest what condition a user might have
2. NEVER provide medical advice beyond general medication information
3. NEVER encourage users to purchase medications
4. ALWAYS redirect users to healthcare professionals when:
   - They ask about symptoms or conditions
   - They ask for medical advice
   - They ask about drug interactions (beyond basic information)
   - They ask about side effects beyond what's in the medication leaflet
   - They ask about dosage adjustments for their specific condition

You can:
- Provide general medication information (name, active ingredient, usage instructions)
- Check medication availability and stock
- Check prescription requirements
- Provide general usage instructions from medication leaflets
- Answer questions about medication names in English and Hebrew
- Provide complete inventory overview: When users ask for "all inventory", "all drugs stock", or similar requests, first use getAllMedications to get the list of all medication names, then call checkStock for each medication to get their stock levels, and present a comprehensive inventory report.

You are bilingual and can respond in both English and Hebrew. Always respond in the language the user is using, or if they mix languages, respond in the primary language they're using.

When redirecting to a healthcare professional, be polite and clear:
- "I recommend consulting with a healthcare professional for [specific reason]"
- "For questions about [topic], please speak with your doctor or pharmacist"`;

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
    const safetyCheck = this.checkSafetyViolations(userMessage);
    if (safetyCheck.needsRedirect) {
      logger.log(`[${timestamp}] Safety redirect triggered`, { reason: safetyCheck.reason });
      return this.streamRedirectMessage(safetyCheck.reason || 'This question requires medical advice. Please consult with a healthcare professional.');
    }

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: SAFETY_SYSTEM_PROMPT },
      ...conversationHistory,
      { role: 'user', content: userMessage },
    ];

    return this.streamWithFunctionCalling(messages, userId);
  }

  private checkSafetyViolations(message: string): { needsRedirect: boolean; reason?: string } {
    const lowerMessage = message.toLowerCase();
    
    // Patterns that indicate medical advice requests
    const medicalAdvicePatterns = [
      /should i take|should i use|can i take|can i use/i,
      /what should i do for|how should i treat|how do i treat/i,
      /is it safe for me|is it okay for me/i,
      /i have (pain|fever|headache|symptoms?)/i,
      /diagnos|diagnosis/i,
      /side effect|adverse reaction/i,
      /drug interaction|medication interaction/i,
      /dosage for|dose for|how much should/i,
    ];

    for (const pattern of medicalAdvicePatterns) {
      if (pattern.test(lowerMessage)) {
        return {
          needsRedirect: true,
          reason: 'This question requires medical advice. Please consult with a healthcare professional.',
        };
      }
    }

    return { needsRedirect: false };
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
      let toolCallId = '';

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;

        // Handle function calls
        if (delta?.tool_calls) {
          for (const toolCall of delta.tool_calls) {
            if (toolCall.id) {
              toolCallId = toolCall.id;
            }
            if (toolCall.function) {
              if (!functionCall) {
                functionCall = {
                  name: toolCall.function.name || '',
                  arguments: toolCall.function.arguments || '',
                  id: toolCallId,
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

