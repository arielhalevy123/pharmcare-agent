import { db } from '../db/database';

export const pharmacyService = {
  getMedicationByName: (name: string) => db.getMedicationByName(name),
  getAllMedications: () => db.getAllMedications(),
  checkStock: (name: string) => db.checkStock(name),
  checkPrescription: (userId: number, medicationName: string) =>
    db.checkPrescription(userId, medicationName),
};

