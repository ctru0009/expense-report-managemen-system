import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import authRoutes from './modules/auth/auth.routes';
import reportRoutes from './modules/reports/report.routes';
import itemRoutes from './modules/items/item.routes';
import { errorHandler } from './middleware/error-handler';
import { prisma } from './config/prisma';
import './common/types/express';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/reports/:reportId/items', itemRoutes);

app.use(errorHandler);

export { app, prisma };
