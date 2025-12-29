import { db } from '../db/database';

/**
 * PharmacyService - Service layer abstraction for pharmacy operations
 * Provides a clean interface between tools and database operations
 */
export const pharmacyService = {
  /**
   * Retrieves medication information by name (supports English and Hebrew)
   * @param name - Medication name in English or Hebrew
   * @returns Medication object or null if not found
   */
  getMedicationByName: (name: string) => db.getMedicationByName(name),
  
  /**
   * Retrieves all medication names from the database
   * @returns Array of medication names (English) sorted alphabetically
   */
  getAllMedications: () => db.getAllMedications(),
  
  /**
   * Checks stock quantity for a medication
   * @param name - Medication name in English or Hebrew
   * @returns Stock quantity (0 if medication not found)
   */
  checkStock: (name: string) => db.checkStock(name),
  
  /**
   * Checks if a user has a valid prescription for a medication
   * @param userId - User ID to check
   * @param medicationName - Medication name in English or Hebrew
   * @returns true if medication doesn't require prescription or user has valid prescription
   */
  checkPrescription: (userId: number, medicationName: string) =>
    db.checkPrescription(userId, medicationName),
};

