import dotenv from 'dotenv';
dotenv.config();

import path from 'path';
import express from 'express';
import cors from 'cors';
import authRoutes from './modules/auth/auth.routes';
import reportRoutes from './modules/reports/report.routes';
import itemRoutes from './modules/items/item.routes';
import adminRoutes from './modules/admin/admin.routes';
import receiptRoutes from './modules/receipts/receipt.routes';
import { errorHandler } from './middleware/error-handler';
import { prisma } from './config/prisma';
import { config } from './config/env';
import './common/types/express';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/uploads', express.static(path.resolve(config.uploadDir)));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/reports/:reportId/items', itemRoutes);
app.use('/api/reports/:reportId/items/:itemId/receipt', receiptRoutes);
app.use('/api/admin/reports', adminRoutes);

app.use(errorHandler);

export { app, prisma };
