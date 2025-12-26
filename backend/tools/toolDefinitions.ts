import { ChatCompletionTool } from 'openai/resources/chat/completions';

export const toolDefinitions: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'getMedicationByName',
      description:
        'Get detailed information about a medication by its name (supports both English and Hebrew names). Returns medication details including active ingredient, stock, prescription requirements, and usage instructions.',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'The name of the medication in English or Hebrew',
          },
        },
        required: ['name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'checkStock',
      description:
        'Check the current stock availability of a medication. Returns the number of units available.',
      parameters: {
        type: 'object',
        properties: {
          medicationName: {
            type: 'string',
            description: 'The name of the medication to check stock for',
          },
        },
        required: ['medicationName'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'checkPrescription',
      description:
        'Check if a user has a valid prescription for a specific medication. Returns true if the medication does not require a prescription or if the user has a valid prescription.',
      parameters: {
        type: 'object',
        properties: {
          userId: {
            type: 'number',
            description: 'The ID of the user to check prescription for',
          },
          medicationName: {
            type: 'string',
            description: 'The name of the medication to check prescription for',
          },
        },
        required: ['userId', 'medicationName'],
      },
    },
  },
];

