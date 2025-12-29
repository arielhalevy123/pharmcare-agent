import { db } from '../db/database';
import { pharmacyService } from '../services/pharmacyService';
import { logger } from '../utils/logger';

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Executes a tool by name with the provided arguments
 * @param toolName - Name of the tool to execute
 * @param args - Arguments object for the tool
 * @returns ToolResult with success status and data or error message
 */
export async function executeTool(
  toolName: string,
  args: any
): Promise<ToolResult> {
  const timestamp = new Date().toISOString();
  logger.log(`[${timestamp}] Tool Call: ${toolName}`, args);

  try {
    switch (toolName) {
      case 'getMedicationByName':
        return await executeGetMedicationByName(args.name, args.language);

      case 'checkStock':
        return await executeCheckStock(args.medicationName, args.language);

      case 'checkPrescription':
        return await executeCheckPrescription(args.userId, args.medicationName, args.language);

      case 'getAllMedications':
        return await executeGetAllMedications(args.language);

      default:
        return {
          success: false,
          error: `Unknown tool: ${toolName}`,
        };
    }
  } catch (error: any) {
    logger.error(`[${timestamp}] Tool Error: ${toolName}`, error);
    return {
      success: false,
      error: error.message || 'Unknown error occurred',
    };
  }
}

/**
 * Executes the getMedicationByName tool to retrieve medication information
 * @param name - Medication name in English or Hebrew
 * @param language - Language preference: 1 = English (default), 0 = Hebrew
 * @returns ToolResult with medication data or error message
 */
async function executeGetMedicationByName(name: string, language: number = 1): Promise<ToolResult> {
  // Input validation
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return {
      success: false,
      error: 'Medication name is required and must be a non-empty string',
    };
  }

  const medication = await pharmacyService.getMedicationByName(name.trim());

  if (!medication) {
    return {
      success: false,
      error: `Medication "${name}" not found in our database`,
    };
  }

  // Return data in the requested language
  if (language === 0) {
    // Hebrew
    return {
      success: true,
      data: {
        id: medication.id,
        name: medication.nameHebrew,
        activeIngredient: medication.activeIngredientHebrew,
        requiresPrescription: medication.requiresPrescription,
        usageInstructions: medication.usageInstructionsHebrew,
        purpose: medication.purposeHebrew,
      },
    };
  } else {
    // English (default)
    return {
      success: true,
      data: {
        id: medication.id,
        name: medication.name,
        activeIngredient: medication.activeIngredient,
        requiresPrescription: medication.requiresPrescription,
        usageInstructions: medication.usageInstructions,
        purpose: medication.purpose,
      },
    };
  }
}

/**
 * Executes the getAllMedications tool to retrieve all medication names
 * @param language - Language preference: 1 = English (default), 0 = Hebrew
 * @returns ToolResult with array of medication names
 */
async function executeGetAllMedications(language: number = 1): Promise<ToolResult> {
  try {
    const medicationNames = await pharmacyService.getAllMedications();
    
    // Get Hebrew names if requested
    if (language === 0) {
      const medicationsWithHebrew = await Promise.all(
        medicationNames.map(async (name) => {
          const med = await pharmacyService.getMedicationByName(name);
          return med ? med.nameHebrew : name;
        })
      );
      
      return {
        success: true,
        data: {
          medications: medicationsWithHebrew,
          count: medicationsWithHebrew.length,
        },
      };
    }

    return {
      success: true,
      data: {
        medications: medicationNames,
        count: medicationNames.length,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to retrieve medications',
    };
  }
}

/**
 * Executes the checkStock tool to retrieve stock information for one or more medications
 * @param medicationName - Single medication name (string) or array of medication names
 * @param language - Language preference: 1 = English (default), 0 = Hebrew
 * @param rawArgs - Optional raw arguments for handling edge cases
 * @returns ToolResult with stock information
 */
async function executeCheckStock(medicationName: string | string[], language: number = 1, rawArgs?: any): Promise<ToolResult> {
  const timestamp = new Date().toISOString();
  logger.log(`[${timestamp}] executeCheckStock called`, {
    medicationName,
    medicationNameType: typeof medicationName,
    isArray: Array.isArray(medicationName),
    rawArgs,
  });

  // ---------------------------
  // 1️⃣ Handle array input
  // ---------------------------
  if (Array.isArray(medicationName)) {
    const results = [];
    const errors = [];

    for (const name of medicationName) {
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        errors.push(`Invalid medication name: ${name}`);
        continue;
      }

      try {
        const stock = await pharmacyService.checkStock(name.trim());
        const med = await pharmacyService.getMedicationByName(name.trim());

        if (!med) {
          errors.push(`Medication "${name}" not found`);
          continue;
        }

        results.push({
          medicationName: language === 0 ? med.nameHebrew : med.name,
          stock,
          available: stock > 0,
        });
      } catch (error: any) {
        errors.push(`Error checking stock for "${name}": ${error.message}`);
      }
    }

    return {
      success: true,
      data: { medications: results, errors },
    };
  }

  // --------------------------------------------------------------
  // 2️⃣ Handle concatenated JSON: {}{}{}{} (the old wrong behavior)
  // --------------------------------------------------------------
  if (typeof medicationName !== 'string' || medicationName.trim() === '') {
    const concatenated: string = rawArgs?.medicationName ?? '';

    const matches = concatenated.match(/\{"medicationName":\s*"([^"]+)"\}/g);
    if (matches && matches.length > 0) {
      const names = matches.map(m => JSON.parse(m).medicationName);
      logger.log(`[${timestamp}] Parsed concatenated medication names`, { names });
      return await executeCheckStock(names, language);
    }

    return {
      success: false,
      error: 'Medication name is required and must be a non-empty string',
    };
  }

  // ------------------------------
  // 3️⃣ Single medication fallback
  // ------------------------------
  const medName = medicationName.trim();
  const stock = await pharmacyService.checkStock(medName);
  const med = await pharmacyService.getMedicationByName(medName);

  if (!med) {
    return { success: false, error: `Medication "${medName}" not found in our database` };
  }

  return {
    success: true,
    data: {
      medicationName: language === 0 ? med.nameHebrew : med.name,
      stock,
      available: stock > 0,
    },
  };
}
/**
 * Executes the checkPrescription tool to verify if a user has a valid prescription
 * @param userId - User ID to check
 * @param medicationName - Medication name in English or Hebrew
 * @param language - Language preference: 1 = English (default), 0 = Hebrew
 * @returns ToolResult with prescription status and purchase eligibility
 */
async function executeCheckPrescription(
  userId: number,
  medicationName: string,
  language: number = 1
): Promise<ToolResult> {
  // Input validation
  if (!userId || typeof userId !== 'number' || userId <= 0) {
    return {
      success: false,
      error: 'Valid user ID is required (must be a positive number)',
    };
  }

  if (!medicationName || typeof medicationName !== 'string' || medicationName.trim().length === 0) {
    return {
      success: false,
      error: 'Medication name is required and must be a non-empty string',
    };
  }

  // Check if user exists
  const user = await db.getUser(userId);
  if (!user) {
    return {
      success: false,
      error: `User with ID ${userId} not found`,
    };
  }

  // Check if medication exists
  const medication = await pharmacyService.getMedicationByName(medicationName.trim());
  if (!medication) {
    return {
      success: false,
      error: `Medication "${medicationName}" not found in our database`,
    };
  }

  const hasPrescription = await pharmacyService.checkPrescription(userId, medicationName.trim());

  return {
    success: true,
    data: {
      userId: userId,
      medicationName: language === 0 ? medication.nameHebrew : medication.name,
      requiresPrescription: medication.requiresPrescription,
      hasValidPrescription: hasPrescription,
      canPurchase: hasPrescription,
    },
  };
}
