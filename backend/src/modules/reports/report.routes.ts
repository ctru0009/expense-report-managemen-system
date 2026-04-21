import { Router } from 'express';
import { z } from 'zod';
import * as reportService from './report.service';
import { authMiddleware } from '../../middleware/auth';
import { ValidationError } from '../../common/errors';

const router = Router();
router.use(authMiddleware);

const createReportSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(1000).optional(),
});

const updateReportSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).nullable().optional(),
});

const statusFilterSchema = z.object({
  status: z.enum(['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED']).optional(),
});

router.get('/', async (req, res, next) => {
  try {
    const parsed = statusFilterSchema.safeParse(req.query);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues.map((i) => i.message).join(', '));
    }

    const reports = await reportService.listByUser(req.user!.userId, parsed.data.status);
    res.json(reports);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const parsed = createReportSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues.map((i) => i.message).join(', '));
    }

    const report = await reportService.create(req.user!.userId, parsed.data);
    res.status(201).json(report);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const report = await reportService.getById(req.params.id, req.user!.userId);
    res.json(report);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const parsed = updateReportSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues.map((i) => i.message).join(', '));
    }

    const report = await reportService.update(req.params.id, req.user!.userId, parsed.data);
    res.json(report);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await reportService.remove(req.params.id, req.user!.userId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

router.post('/:id/submit', async (req, res, next) => {
  try {
    const report = await reportService.submit(req.params.id, req.user!.userId);
    res.json(report);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/reopen', async (req, res, next) => {
  try {
    const report = await reportService.reopen(req.params.id, req.user!.userId);
    res.json(report);
  } catch (err) {
    next(err);
  }
});

export default router;
