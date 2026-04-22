import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config();

process.env.DATABASE_URL = (process.env.DATABASE_URL || '').replace('postgres:5432', 'localhost:5432');
process.env.OPENAI_API_KEY = 'dummy';

export default async () => {
  const prisma = new PrismaClient();
  try {
    await prisma.$connect();
  } catch {
    throw new Error(
      'Integration tests require a running PostgreSQL database. ' +
      'Run `docker compose up postgres` first, or set DATABASE_URL to a reachable instance.'
    );
  } finally {
    await prisma.$disconnect();
  }
};