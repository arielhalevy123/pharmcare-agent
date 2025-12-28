import { db } from '../db/database';
import { pharmacyService } from '../services/pharmacyService';
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

      case 'getAllMedications':
        return await executeGetAllMedications();

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

  const medication = await pharmacyService.getMedicationByName(name.trim());

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
      requiresPrescription: medication.requiresPrescription,
      usageInstructions: medication.usageInstructions,
      usageInstructionsHebrew: medication.usageInstructionsHebrew,
      purpose: medication.purpose,
      purposeHebrew: medication.purposeHebrew,
    },
  };
}

async function executeGetAllMedications(): Promise<ToolResult> {
  try {
    const medicationNames = await pharmacyService.getAllMedications();

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

async function executeCheckStock(medicationName: string | string[], rawArgs?: any): Promise<ToolResult> {
  const timestamp = new Date().toISOString();
  logger.log(`[${timestamp}] executeCheckStock called`, {
    medicationName,
    medicationNameType: typeof medicationName,
    isArray: Array.isArray(medicationName),
    rawArgs,
  });
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/e41a5c1e-ac10-412b-9d3c-e7600e7576f6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'toolExecutor.ts:101',message:'executeCheckStock entry',data:{medicationName,isArray:Array.isArray(medicationName)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,D,E'})}).catch(()=>{});
  // #endregion

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
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/e41a5c1e-ac10-412b-9d3c-e7600e7576f6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'toolExecutor.ts:123',message:'before checkStock call',data:{inputName:name.trim()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,D,E'})}).catch(()=>{});
        // #endregion
        const stock = await pharmacyService.checkStock(name.trim());
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/e41a5c1e-ac10-412b-9d3c-e7600e7576f6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'toolExecutor.ts:125',message:'after checkStock call',data:{stock,inputName:name.trim()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,D,E'})}).catch(()=>{});
        // #endregion
        const med = await pharmacyService.getMedicationByName(name.trim());
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/e41a5c1e-ac10-412b-9d3c-e7600e7576f6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'toolExecutor.ts:128',message:'after getMedicationByName call',data:{found:!!med,englishName:med?.name,hebrewName:med?.nameHebrew},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
        // #endregion

        if (!med) {
          errors.push(`Medication "${name}" not found`);
          continue;
        }

        results.push({
          medicationName: med.name,
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
      return await executeCheckStock(names);
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
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/e41a5c1e-ac10-412b-9d3c-e7600e7576f6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'toolExecutor.ts:169',message:'single medication path',data:{inputName:medName},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,D,E'})}).catch(()=>{});
  // #endregion
  const stock = await pharmacyService.checkStock(medName);
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/e41a5c1e-ac10-412b-9d3c-e7600e7576f6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'toolExecutor.ts:171',message:'after single checkStock',data:{stock,inputName:medName},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,D,E'})}).catch(()=>{});
  // #endregion
  const med = await pharmacyService.getMedicationByName(medName);
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/e41a5c1e-ac10-412b-9d3c-e7600e7576f6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'toolExecutor.ts:173',message:'after single getMedicationByName',data:{found:!!med,englishName:med?.name,hebrewName:med?.nameHebrew},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
  // #endregion

  if (!med) {
    return { success: false, error: `Medication "${medName}" not found in our database` };
  }

  return {
    success: true,
    data: {
      medicationName: med.name,
      stock,
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
      medicationName: medication.name,
      requiresPrescription: medication.requiresPrescription,
      hasValidPrescription: hasPrescription,
      canPurchase: hasPrescription,
    },
  };
}
