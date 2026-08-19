import { Router } from 'express';
import multer from 'multer';
import { config } from '../../config/env.js';
import { requireAdmin, requireAuth } from '../../middleware/auth.js';
import { uploadLimiter } from '../../middleware/rateLimit.js';
import { validate } from '../../middleware/validate.js';
import {
  getScanImage,
  getScans,
  postApproveScan,
  postRejectScan,
  uploadScan,
} from './controller.js';
import {
  approveScanSchema,
  listScansQuerySchema,
  rejectScanSchema,
  scanIdParamsSchema,
  scanImageParamsSchema,
} from './schemas.js';

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxUploadBytes, files: 2 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
      return cb(new Error('Solo se aceptan fotos JPEG, PNG o WEBP'));
    }
    cb(null, true);
  },
});

export const productScansRouter = Router();

// Cualquier usuario autenticado puede proponer un escaneo — es la parte
// "crowdsourced" de la feature. Revisar/aprobar sí requiere admin.
productScansRouter.post(
  '/product-scans/upload',
  requireAuth,
  uploadLimiter,
  upload.fields([
    { name: 'packageImage', maxCount: 1 },
    { name: 'nutritionImage', maxCount: 1 },
  ]),
  uploadScan
);

productScansRouter.get(
  '/product-scans',
  requireAuth,
  requireAdmin,
  validate({ query: listScansQuerySchema }),
  getScans
);

productScansRouter.get(
  '/product-scans/:id/image/:type',
  requireAuth,
  requireAdmin,
  validate({ params: scanImageParamsSchema }),
  getScanImage
);

productScansRouter.post(
  '/product-scans/:id/approve',
  requireAuth,
  requireAdmin,
  validate({ params: scanIdParamsSchema, body: approveScanSchema }),
  postApproveScan
);

productScansRouter.post(
  '/product-scans/:id/reject',
  requireAuth,
  requireAdmin,
  validate({ params: scanIdParamsSchema, body: rejectScanSchema }),
  postRejectScan
);
