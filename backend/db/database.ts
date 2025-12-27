import sqlite3 from 'sqlite3';

export interface User {
  id: number;
  name: string;
  hasPrescriptionPermission: boolean;
}

export interface Medication {
  id: number;
  name: string;
  nameHebrew: string;
  activeIngredient: string;
  activeIngredientHebrew: string;
  stock: number;
  requiresPrescription: boolean;
  usageInstructions: string;
  usageInstructionsHebrew: string;
}

export interface Prescription {
  id: number;
  userId: number;
  medicationId: number;
  valid: boolean;
}

class Database {
  private db: sqlite3.Database;
  private initialized: Promise<void>;

  constructor() {
    this.db = new sqlite3.Database(':memory:');
    this.initialized = this.initializeDatabase();
  }

  async ensureInitialized(): Promise<void> {
    await this.initialized;
  }

  private async initializeDatabase(): Promise<void> {
    // Helper function to promisify db.run with parameters
    const run = (sql: string, params?: any[]): Promise<void> => {
      return new Promise((resolve, reject) => {
        if (params) {
          this.db.run(sql, params, (err: Error | null) => {
            if (err) reject(err);
            else resolve();
          });
        } else {
          this.db.run(sql, (err: Error | null) => {
            if (err) reject(err);
            else resolve();
          });
        }
      });
    };

    // Create tables
    await run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        hasPrescriptionPermission INTEGER NOT NULL DEFAULT 0
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS medications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        nameHebrew TEXT NOT NULL,
        activeIngredient TEXT NOT NULL,
        activeIngredientHebrew TEXT NOT NULL,
        stock INTEGER NOT NULL,
        requiresPrescription INTEGER NOT NULL DEFAULT 0,
        usageInstructions TEXT NOT NULL,
        usageInstructionsHebrew TEXT NOT NULL
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS prescriptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        medicationId INTEGER NOT NULL,
        valid INTEGER NOT NULL DEFAULT 1,
        FOREIGN KEY (userId) REFERENCES users(id),
        FOREIGN KEY (medicationId) REFERENCES medications(id)
      )
    `);

    // Insert synthetic data
    await this.insertSyntheticData();
  }

  private async insertSyntheticData(): Promise<void> {
    // Helper function to promisify db.run with parameters
    const run = (sql: string, params?: any[]): Promise<void> => {
      return new Promise((resolve, reject) => {
        if (params) {
          this.db.run(sql, params, (err: Error | null) => {
            if (err) reject(err);
            else resolve();
          });
        } else {
          this.db.run(sql, (err: Error | null) => {
            if (err) reject(err);
            else resolve();
          });
        }
      });
    };

    // Insert 10 users (5 with prescription permissions)
    const users = [
      { name: 'Alice Johnson', hasPrescriptionPermission: true },
      { name: 'Bob Smith', hasPrescriptionPermission: false },
      { name: 'Carol White', hasPrescriptionPermission: true },
      { name: 'David Brown', hasPrescriptionPermission: false },
      { name: 'Eve Davis', hasPrescriptionPermission: true },
      { name: 'Frank Miller', hasPrescriptionPermission: false },
      { name: 'Grace Wilson', hasPrescriptionPermission: true },
      { name: 'Henry Moore', hasPrescriptionPermission: false },
      { name: 'Iris Taylor', hasPrescriptionPermission: true },
      { name: 'Jack Anderson', hasPrescriptionPermission: false },
    ];

    for (const user of users) {
      await run(
        'INSERT INTO users (name, hasPrescriptionPermission) VALUES (?, ?)',
        [user.name, user.hasPrescriptionPermission ? 1 : 0]
      );
    }

    // Insert 5 medications
    const medications = [
      {
        name: 'Paracetamol',
        nameHebrew: 'פאראצטמול',
        activeIngredient: 'Acetaminophen',
        activeIngredientHebrew: 'אצטאמינופן',
        stock: 150,
        requiresPrescription: false,
        usageInstructions: 'Take 500-1000mg every 4-6 hours as needed. Do not exceed 4g per day.',
        usageInstructionsHebrew: 'קח 500-1000 מ"ג כל 4-6 שעות לפי הצורך. אל תחרוג מ-4 גרם ליום.',
      },
      {
        name: 'Ibuprofen',
        nameHebrew: 'איבופרופן',
        activeIngredient: 'Ibuprofen',
        activeIngredientHebrew: 'איבופרופן',
        stock: 80,
        requiresPrescription: false,
        usageInstructions: 'Take 200-400mg every 4-6 hours with food. Maximum 1200mg per day.',
        usageInstructionsHebrew: 'קח 200-400 מ"ג כל 4-6 שעות עם אוכל. מקסימום 1200 מ"ג ליום.',
      },
      {
        name: 'Amoxicillin',
        nameHebrew: 'אמוקסיצילין',
        activeIngredient: 'Amoxicillin',
        activeIngredientHebrew: 'אמוקסיצילין',
        stock: 45,
        requiresPrescription: true,
        usageInstructions: 'Take 500mg three times daily for 7-10 days. Complete the full course even if symptoms improve.',
        usageInstructionsHebrew: 'קח 500 מ"ג שלוש פעמים ביום למשך 7-10 ימים. השלם את המנה המלאה גם אם התסמינים משתפרים.',
      },
      {
        name: 'Aspirin',
        nameHebrew: 'אספירין',
        activeIngredient: 'Acetylsalicylic acid',
        activeIngredientHebrew: 'חומצה אצטילסליצילית',
        stock: 200,
        requiresPrescription: false,
        usageInstructions: 'Take 75-325mg once daily. Do not give to children under 16.',
        usageInstructionsHebrew: 'קח 75-325 מ"ג פעם ביום. אל תתן לילדים מתחת לגיל 16.',
      },
      {
        name: 'Metformin',
        nameHebrew: 'מטפורמין',
        activeIngredient: 'Metformin hydrochloride',
        activeIngredientHebrew: 'מטפורמין הידרוכלוריד',
        stock: 30,
        requiresPrescription: true,
        usageInstructions: 'Take 500-1000mg twice daily with meals. Monitor blood sugar levels regularly.',
        usageInstructionsHebrew: 'קח 500-1000 מ"ג פעמיים ביום עם הארוחות. בדוק את רמות הסוכר בדם באופן קבוע.',
      },
    ];

    for (const med of medications) {
      await run(
        `INSERT INTO medications (name, nameHebrew, activeIngredient, activeIngredientHebrew, stock, requiresPrescription, usageInstructions, usageInstructionsHebrew)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          med.name,
          med.nameHebrew,
          med.activeIngredient,
          med.activeIngredientHebrew,
          med.stock,
          med.requiresPrescription ? 1 : 0,
          med.usageInstructions,
          med.usageInstructionsHebrew,
        ]
      );
    }

    // Insert some prescriptions
    const prescriptions = [
      { userId: 1, medicationId: 3 }, // Alice has Amoxicillin
      { userId: 1, medicationId: 5 }, // Alice has Metformin
      { userId: 3, medicationId: 3 }, // Carol has Amoxicillin
      { userId: 5, medicationId: 5 }, // Eve has Metformin
    ];

    for (const presc of prescriptions) {
      await run(
        'INSERT INTO prescriptions (userId, medicationId, valid) VALUES (?, ?, ?)',
        [presc.userId, presc.medicationId, 1]
      );
    }
  }

  async getUser(userId: number): Promise<User | null> {
    await this.ensureInitialized();
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM users WHERE id = ?',
        [userId],
        (err, row: any) => {
          if (err) {
            reject(err);
          } else {
            resolve(
              row
                ? {
                    id: row.id,
                    name: row.name,
                    hasPrescriptionPermission: row.hasPrescriptionPermission === 1,
                  }
                : null
            );
          }
        }
      );
    });
  }

  async getMedicationByName(name: string): Promise<Medication | null> {
    await this.ensureInitialized();
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM medications WHERE LOWER(name) = LOWER(?) OR LOWER(nameHebrew) = LOWER(?)',
        [name, name],
        (err, row: any) => {
          if (err) {
            reject(err);
          } else {
            resolve(
              row
                ? {
                    id: row.id,
                    name: row.name,
                    nameHebrew: row.nameHebrew,
                    activeIngredient: row.activeIngredient,
                    activeIngredientHebrew: row.activeIngredientHebrew,
                    stock: row.stock,
                    requiresPrescription: row.requiresPrescription === 1,
                    usageInstructions: row.usageInstructions,
                    usageInstructionsHebrew: row.usageInstructionsHebrew,
                  }
                : null
            );
          }
        }
      );
    });
  }

  async getAllMedications(): Promise<string[]> {
    await this.ensureInitialized();
    return new Promise((resolve, reject) => {
      this.db.all('SELECT name FROM medications ORDER BY name', [], (err, rows: any[]) => {
        if (err) {
          reject(err);
        } else {
          const medicationNames = rows ? rows.map((row) => row.name) : [];
          resolve(medicationNames);
        }
      });
    });
  }

  async checkStock(medicationName: string): Promise<number> {
    await this.ensureInitialized();
    const medication = await this.getMedicationByName(medicationName);
    return medication ? medication.stock : 0;
  }

  async checkPrescription(userId: number, medicationName: string): Promise<boolean> {
    await this.ensureInitialized();
    const medication = await this.getMedicationByName(medicationName);
    if (!medication) {
      return false;
    }

    if (!medication.requiresPrescription) {
      return true; // No prescription needed
    }

    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT COUNT(*) as count FROM prescriptions 
         WHERE userId = ? AND medicationId = ? AND valid = 1`,
        [userId, medication.id],
        (err, row: any) => {
          if (err) {
            reject(err);
          } else {
            resolve((row?.count || 0) > 0);
          }
        }
      );
    });
  }

  close(): void {
    this.db.close();
  }
}

export const db = new Database();

