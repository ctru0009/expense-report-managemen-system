import { Router, Request } from 'express';
import { z } from 'zod';
import { upload } from '../../config/multer';
import { authMiddleware } from '../../middleware/auth';
import { ValidationError } from '../../common/errors';
import * as receiptService from './receipt.service';

const router = Router({ mergeParams: true });
router.use(authMiddleware);

interface ReceiptRequest extends Request {
  params: {
    reportId: string;
    itemId: string;
  };
}

const applySchema = z.object({
  merchantName: z.string().optional(),
  amount: z.number().positive().optional(),
  currency: z.string().length(3).optional(),
  category: z.enum(['TRAVEL', 'MEALS', 'OFFICE_SUPPLIES', 'SOFTWARE', 'HARDWARE', 'MARKETING', 'OTHER']).optional(),
  transactionDate: z.string().optional(),
});

router.post(
  '/',
  upload.single('receipt'),
  async (req: ReceiptRequest, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'No file uploaded' } });
      }

      const result = await receiptService.uploadReceipt(
        req.params.reportId,
        req.params.itemId,
        req.user!.userId,
        req.file,
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/extract',
  async (req: ReceiptRequest, res, next) => {
    try {
      const result = await receiptService.extractReceipt(
        req.params.reportId,
        req.params.itemId,
        req.user!.userId,
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  '/apply',
  async (req: ReceiptRequest, res, next) => {
    try {
      const parsed = applySchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError(parsed.error.issues.map((i) => i.message).join(', '));
      }

      if (Object.keys(parsed.data).length === 0) {
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'No fields provided' } });
      }

      const item = await receiptService.applyExtraction(
        req.params.reportId,
        req.params.itemId,
        req.user!.userId,
        parsed.data,
      );
      res.json(item);
    } catch (err) {
      next(err);
    }
  },
);

router.delete(
  '/',
  async (req: ReceiptRequest, res, next) => {
    try {
      const item = await receiptService.deleteReceipt(
        req.params.reportId,
        req.params.itemId,
        req.user!.userId,
      );
      res.json(item);
    } catch (err) {
      next(err);
    }
  },
);

export default router;