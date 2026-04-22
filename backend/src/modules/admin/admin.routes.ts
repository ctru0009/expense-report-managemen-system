import { Router, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import * as adminService from './admin.service';
import { authMiddleware } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { ValidationError } from '../../common/errors';

const router = Router();
router.use(authMiddleware);
router.use(requireRole('ADMIN'));

const listQuerySchema = z.object({
  status: z.enum(['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED']).optional(),
  userId: z.string().uuid().optional(),
});

const idParamSchema = z.object({
  id: z.string().uuid('Invalid report ID'),
});

function validateParamId(req: { params: { id?: string } }, _res: Response, next: NextFunction) {
  const parsed = idParamSchema.safeParse(req.params);
  if (!parsed.success) {
    return next(new ValidationError(parsed.error.issues.map((i) => i.message).join(', ')));
  }
  next();
}

router.get('/', async (req, res, next) => {
  try {
    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues.map((i) => i.message).join(', '));
    }

    const reports = await adminService.listAllReports(parsed.data.status, parsed.data.userId);
    res.json(reports);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', validateParamId, async (req, res, next) => {
  try {
    const report = await adminService.getReportById(req.params.id!);
    res.json(report);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/approve', validateParamId, async (req, res, next) => {
  try {
    const report = await adminService.approveReport(req.params.id!);
    res.json(report);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/reject', validateParamId, async (req, res, next) => {
  try {
    const report = await adminService.rejectReport(req.params.id!);
    res.json(report);
  } catch (err) {
    next(err);
  }
});

export default router;