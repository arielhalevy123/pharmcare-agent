import { ChatCompletionTool } from 'openai/resources/chat/completions';

export const toolDefinitions: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'getMedicationByName',
      description:
        'Get detailed information about a medication by its name (supports both English and Hebrew names). Returns medication details including active ingredient, prescription requirements, and usage instructions (does NOT include stock information).',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'The name of the medication in English or Hebrew',
          },
          language: {
            type: 'number',
            description: 'Language preference for medication names: 1 = English (default), 0 = Hebrew',
            enum: [0, 1],
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
        'Check current stock for one medication or a list of medications. Use a single string for one medication, or an array of strings for multiple medications.',
      parameters: {
        type: 'object',
        properties: {
          medicationName: {
            // string | string[]
            anyOf: [
              {
                type: 'string',
                description: 'Single medication name to check stock for',
              },
              {
                type: 'array',
                items: { type: 'string' },
                description: 'List of medication names to check stock for',
              },
            ],
          },
          language: {
            type: 'number',
            description: 'Language preference for medication names: 1 = English (default), 0 = Hebrew',
            enum: [0, 1],
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
        'Check if a user has a valid prescription for a specific medication. Returns true if the medication does not require a prescription or if the user has a valid prescription. The userId is automatically provided from the session context - you should NOT ask the user for it.',
      parameters: {
        type: 'object',
        properties: {
          userId: {
            type: 'number',
            description: 'The ID of the user to check prescription for (automatically provided from session - do not ask user for this)',
          },
          medicationName: {
            type: 'string',
            description: 'The name of the medication to check prescription for',
          },
          language: {
            type: 'number',
            description: 'Language preference for medication names: 1 = English (default), 0 = Hebrew',
            enum: [0, 1],
          },
        },
        required: ['medicationName'], // userId is optional since it's auto-injected
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'getAllMedications',
      description:
        'Get a list of all medication names in the database. Returns an array of medication names (e.g., ["Paracetamol", "Ibuprofen", ...]).',
      parameters: {
        type: 'object',
        properties: {
          language: {
            type: 'number',
            description: 'Language preference for medication names: 1 = English (default), 0 = Hebrew',
            enum: [0, 1],
          },
        },
      },
    },
  },
];
