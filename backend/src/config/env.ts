import dotenv from 'dotenv';
import type { SignOptions } from 'jsonwebtoken';

dotenv.config();

export const config = {
  jwtSecret: process.env.JWT_SECRET || 'dev-secret',
  jwtExpiresIn: (process.env.JWT_EXPIRES_IN || '7d') as NonNullable<SignOptions['expiresIn']>,
  port: parseInt(process.env.PORT || '3001', 10),
  databaseUrl: process.env.DATABASE_URL!,
  uploadDir: process.env.UPLOAD_DIR || './uploads',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
};
