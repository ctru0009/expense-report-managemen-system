import { Router, Request } from 'express';
import { z } from 'zod';
import * as itemService from './item.service';
import { authMiddleware } from '../../middleware/auth';
import { ValidationError } from '../../common/errors';

const router = Router({ mergeParams: true });
router.use(authMiddleware);

interface ItemRequest extends Request {
  params: {
    reportId: string;
    id?: string;
  };
}

const createItemSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().length(3).default('USD'),
  category: z.enum(['TRAVEL', 'MEALS', 'OFFICE_SUPPLIES', 'SOFTWARE', 'HARDWARE', 'MARKETING', 'OTHER']),
  merchantName: z.string().trim().min(1, 'Merchant name is required').max(200),
  transactionDate: z.string().datetime({ message: 'Invalid date format' }).transform((val) => new Date(val)),
  receiptUrl: z.string().url().optional(),
});

const updateItemSchema = z.object({
  amount: z.number().positive().optional(),
  currency: z.string().length(3).optional(),
  category: z.enum(['TRAVEL', 'MEALS', 'OFFICE_SUPPLIES', 'SOFTWARE', 'HARDWARE', 'MARKETING', 'OTHER']).optional(),
  merchantName: z.string().trim().min(1).max(200).optional(),
  transactionDate: z.string().datetime({ message: 'Invalid date format' }).transform((val) => new Date(val)).optional(),
  receiptUrl: z.string().url().nullable().optional(),
});

router.get('/', async (req: ItemRequest, res, next) => {
  try {
    const items = await itemService.listByReport(req.params.reportId, req.user!.userId);
    res.json(items);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req: ItemRequest, res, next) => {
  try {
    const parsed = createItemSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues.map((i) => i.message).join(', '));
    }

    const item = await itemService.create(
      req.params.reportId,
      req.user!.userId,
      parsed.data
    );
    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req: ItemRequest, res, next) => {
  try {
    const parsed = updateItemSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues.map((i) => i.message).join(', '));
    }

    const item = await itemService.update(
      req.params.id!,
      req.params.reportId,
      req.user!.userId,
      parsed.data
    );
    res.json(item);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req: ItemRequest, res, next) => {
  try {
    await itemService.remove(req.params.id!, req.params.reportId, req.user!.userId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
