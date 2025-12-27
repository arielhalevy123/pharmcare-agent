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
  requiresPrescription: boolean;
  usageInstructions: string;
  usageInstructionsHebrew: string;
  purpose: string;
  purposeHebrew: string;
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
        requiresPrescription INTEGER NOT NULL DEFAULT 0,
        usageInstructions TEXT NOT NULL,
        usageInstructionsHebrew TEXT NOT NULL,
        purpose TEXT NOT NULL,
        purposeHebrew TEXT NOT NULL
      )
    `);

    await run(`
      CREATE TABLE IF NOT EXISTS stock (
        name TEXT PRIMARY KEY,
        quantity INTEGER NOT NULL
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
        requiresPrescription: false,
        usageInstructions: 'Take 500-1000mg every 4-6 hours as needed. Do not exceed 4g per day.',
        usageInstructionsHebrew: 'קח 500-1000 מ"ג כל 4-6 שעות לפי הצורך. אל תחרוג מ-4 גרם ליום.',
        purpose: 'Pain relief and fever reduction',
        purposeHebrew: 'הקלה על כאבים והורדת חום',
        stock: 150,
      },
      {
        name: 'Ibuprofen',
        nameHebrew: 'איבופרופן',
        activeIngredient: 'Ibuprofen',
        activeIngredientHebrew: 'איבופרופן',
        requiresPrescription: false,
        usageInstructions: 'Take 200-400mg every 4-6 hours with food. Maximum 1200mg per day.',
        usageInstructionsHebrew: 'קח 200-400 מ"ג כל 4-6 שעות עם אוכל. מקסימום 1200 מ"ג ליום.',
        purpose: 'Pain relief, inflammation reduction, fever reduction',
        purposeHebrew: 'הקלה על כאבים, הפחתת דלקות, הורדת חום',
        stock: 80,
      },
      {
        name: 'Amoxicillin',
        nameHebrew: 'אמוקסיצילין',
        activeIngredient: 'Amoxicillin',
        activeIngredientHebrew: 'אמוקסיצילין',
        requiresPrescription: true,
        usageInstructions: 'Take 500mg three times daily for 7-10 days. Complete the full course even if symptoms improve.',
        usageInstructionsHebrew: 'קח 500 מ"ג שלוש פעמים ביום למשך 7-10 ימים. השלם את המנה המלאה גם אם התסמינים משתפרים.',
        purpose: 'Bacterial infections treatment',
        purposeHebrew: 'טיפול בזיהומים חיידקיים',
        stock: 45,
      },
      {
        name: 'Aspirin',
        nameHebrew: 'אספירין',
        activeIngredient: 'Acetylsalicylic acid',
        activeIngredientHebrew: 'חומצה אצטילסליצילית',
        requiresPrescription: false,
        usageInstructions: 'Take 75-325mg once daily. Do not give to children under 16.',
        usageInstructionsHebrew: 'קח 75-325 מ"ג פעם ביום. אל תתן לילדים מתחת לגיל 16.',
        purpose: 'Pain relief, blood thinning, heart attack prevention',
        purposeHebrew: 'הקלה על כאבים, דילול דם, מניעת התקפי לב',
        stock: 200,
      },
      {
        name: 'Metformin',
        nameHebrew: 'מטפורמין',
        activeIngredient: 'Metformin hydrochloride',
        activeIngredientHebrew: 'מטפורמין הידרוכלוריד',
        requiresPrescription: true,
        usageInstructions: 'Take 500-1000mg twice daily with meals. Monitor blood sugar levels regularly.',
        usageInstructionsHebrew: 'קח 500-1000 מ"ג פעמיים ביום עם הארוחות. בדוק את רמות הסוכר בדם באופן קבוע.',
        purpose: 'Type 2 diabetes management',
        purposeHebrew: 'ניהול סוכרת מסוג 2',
        stock: 30,
      },
    ];

    // Insert medications (without stock)
    for (const med of medications) {
      await run(
        `INSERT INTO medications (name, nameHebrew, activeIngredient, activeIngredientHebrew, requiresPrescription, usageInstructions, usageInstructionsHebrew, purpose, purposeHebrew)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          med.name,
          med.nameHebrew,
          med.activeIngredient,
          med.activeIngredientHebrew,
          med.requiresPrescription ? 1 : 0,
          med.usageInstructions,
          med.usageInstructionsHebrew,
          med.purpose,
          med.purposeHebrew,
        ]
      );
    }

    // Insert stock data separately
    for (const med of medications) {
      await run(
        'INSERT INTO stock (name, quantity) VALUES (?, ?)',
        [med.name, med.stock]
      );
    }

    // Insert some prescriptions
    const prescriptions = [
      { userId: 1, medicationId: 3 }, // Alice has Amoxicillin
      { userId: 1, medicationId: 5 }, // Alice has Metformin
      { userId: 3, medicationId: 3 }, // Carol has Amoxicillin
      { userId: 5, medicationId: 5 }, // Eve has Metformin
      { userId: 7, medicationId: 3 }, // Grace has Amoxicillin
      { userId: 7, medicationId: 5 }, // Grace has Metformin
      { userId: 9, medicationId: 3 }, // Iris has Amoxicillin
      { userId: 9, medicationId: 5 }, // Iris has Metformin
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
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/e41a5c1e-ac10-412b-9d3c-e7600e7576f6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'database.ts:281',message:'getMedicationByName entry',data:{inputName:name},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM medications WHERE LOWER(name) = LOWER(?) OR LOWER(nameHebrew) = LOWER(?)',
        [name, name],
        (err, row: any) => {
          // #region agent log
          fetch('http://127.0.0.1:7243/ingest/e41a5c1e-ac10-412b-9d3c-e7600e7576f6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'database.ts:287',message:'getMedicationByName result',data:{err:err?.message,found:!!row,englishName:row?.name,hebrewName:row?.nameHebrew},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
          // #endregion
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
                    requiresPrescription: row.requiresPrescription === 1,
                    usageInstructions: row.usageInstructions,
                    usageInstructionsHebrew: row.usageInstructionsHebrew,
                    purpose: row.purpose,
                    purposeHebrew: row.purposeHebrew,
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
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/e41a5c1e-ac10-412b-9d3c-e7600e7576f6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'database.ts:327',message:'checkStock entry',data:{medicationName},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A,B,D,E'})}).catch(()=>{});
    // #endregion
    
    // First resolve the medication to get the canonical English name
    // This handles both English and Hebrew name inputs
    const medication = await this.getMedicationByName(medicationName);
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/e41a5c1e-ac10-412b-9d3c-e7600e7576f6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'database.ts:331',message:'after getMedicationByName resolution',data:{found:!!medication,englishName:medication?.name,originalInput:medicationName},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    
    if (!medication) {
      // Medication not found, return 0
      return 0;
    }
    
    // Use the canonical English name to query the stock table
    const englishName = medication.name;
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/e41a5c1e-ac10-412b-9d3c-e7600e7576f6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'database.ts:341',message:'before stock query with english name',data:{queryName:englishName},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A,C,D,E'})}).catch(()=>{});
    // #endregion
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT quantity FROM stock WHERE name = ?',
        [englishName],
        (err, row: any) => {
          // #region agent log
          fetch('http://127.0.0.1:7243/ingest/e41a5c1e-ac10-412b-9d3c-e7600e7576f6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'database.ts:347',message:'stock query result',data:{err:err?.message,found:!!row,quantity:row?.quantity,returnedValue:row ? row.quantity : 0},timestamp:Date.now(),sessionId:'debug-session',runId:'post-fix',hypothesisId:'A,C,D,E'})}).catch(()=>{});
          // #endregion
          if (err) {
            reject(err);
          } else {
            resolve(row ? row.quantity : 0);
          }
        }
      );
    });
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

