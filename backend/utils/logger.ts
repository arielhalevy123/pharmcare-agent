export const logger = {
  log: (message: string, data?: any) => {
    console.log(`[LOG] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  },
  error: (message: string, error?: any) => {
    console.error(`[ERROR] ${message}`, error ? JSON.stringify(error, null, 2) : '');
  },
  info: (message: string, data?: any) => {
    console.info(`[INFO] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  },
};

