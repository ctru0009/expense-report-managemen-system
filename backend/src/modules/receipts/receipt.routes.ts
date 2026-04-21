import { Router, Request } from 'express';
import { upload } from '../../config/multer';
import { authMiddleware } from '../../middleware/auth';
import * as receiptService from './receipt.service';

const router = Router({ mergeParams: true });
router.use(authMiddleware);

interface ReceiptRequest extends Request {
  params: {
    reportId: string;
    itemId: string;
  };
}

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