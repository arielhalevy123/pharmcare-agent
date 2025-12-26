import { db, Medication } from '../db/database';
import { logger } from '../utils/logger';

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
}

export async function executeTool(
  toolName: string,
  args: any
): Promise<ToolResult> {
  const timestamp = new Date().toISOString();
  logger.log(`[${timestamp}] Tool Call: ${toolName}`, args);

  try {
    switch (toolName) {
      case 'getMedicationByName':
        return await executeGetMedicationByName(args.name);

      case 'checkStock':
        return await executeCheckStock(args.medicationName);

      case 'checkPrescription':
        return await executeCheckPrescription(args.userId, args.medicationName);

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

async function executeGetMedicationByName(name: string): Promise<ToolResult> {
  // Input validation
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return {
      success: false,
      error: 'Medication name is required and must be a non-empty string',
    };
  }

  const medication = await db.getMedicationByName(name.trim());

  if (!medication) {
    return {
      success: false,
      error: `Medication "${name}" not found in our database`,
    };
  }

  return {
    success: true,
    data: {
      id: medication.id,
      name: medication.name,
      nameHebrew: medication.nameHebrew,
      activeIngredient: medication.activeIngredient,
      activeIngredientHebrew: medication.activeIngredientHebrew,
      stock: medication.stock,
      requiresPrescription: medication.requiresPrescription,
      usageInstructions: medication.usageInstructions,
      usageInstructionsHebrew: medication.usageInstructionsHebrew,
    },
  };
}

async function executeCheckStock(medicationName: string): Promise<ToolResult> {
  // Input validation
  if (!medicationName || typeof medicationName !== 'string' || medicationName.trim().length === 0) {
    return {
      success: false,
      error: 'Medication name is required and must be a non-empty string',
    };
  }

  const stock = await db.checkStock(medicationName.trim());

  // Check if medication exists
  const medication = await db.getMedicationByName(medicationName.trim());
  if (!medication) {
    return {
      success: false,
      error: `Medication "${medicationName}" not found in our database`,
    };
  }

  return {
    success: true,
    data: {
      medicationName: medication.name,
      stock: stock,
      available: stock > 0,
    },
  };
}

async function executeCheckPrescription(
  userId: number,
  medicationName: string
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
  const medication = await db.getMedicationByName(medicationName.trim());
  if (!medication) {
    return {
      success: false,
      error: `Medication "${medicationName}" not found in our database`,
    };
  }

  const hasPrescription = await db.checkPrescription(userId, medicationName.trim());

  return {
    success: true,
    data: {
      userId: userId,
      medicationName: medication.name,
      requiresPrescription: medication.requiresPrescription,
      hasValidPrescription: hasPrescription,
      canPurchase: hasPrescription,
    },
  };
}

