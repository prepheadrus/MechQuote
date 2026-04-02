/**
 * Merkezi loglama sistemi
 */

/**
 * Hata loglama
 */
export const logError = (error: Error, context: string, metadata?: any) => {
  const timestamp = new Date().toISOString();
  const errorLog = {
    timestamp,
    level: 'ERROR',
    context,
    message: error.message,
    stack: error.stack,
    metadata
  };

  console.error(JSON.stringify(errorLog));
  
  // Burada log dosyasına yazma veya dış servis gönderme işlemleri eklenebilir
};

/**
 * Bilgi loglama
 */
export const logInfo = (message: string, context: string, metadata?: any) => {
  const timestamp = new Date().toISOString();
  const infoLog = {
    timestamp,
    level: 'INFO',
    context,
    message,
    metadata
  };

  console.info(JSON.stringify(infoLog));
  
  // Burada log dosyasına yazma veya dış servis gönderme işlemleri eklenebilir
};

/**
 * Uyarı loglama
 */
export const logWarning = (message: string, context: string, metadata?: any) => {
  const timestamp = new Date().toISOString();
  const warningLog = {
    timestamp,
    level: 'WARNING',
    context,
    message,
    metadata
  };

  console.warn(JSON.stringify(warningLog));
  
  // Burada log dosyasına yazma veya dış servis gönderme işlemleri eklenebilir
};

/**
 * Loglama için ortak arayüz
 */
export interface LogEntry {
  timestamp: string;
  level: 'ERROR' | 'INFO' | 'WARNING';
  context: string;
  message: string;
  metadata?: any;
}