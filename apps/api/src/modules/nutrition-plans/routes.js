import { Router } from 'express';
import multer from 'multer';
import { config } from '../../config/env.js';
import { requireAuth } from '../../middleware/auth.js';
import { uploadLimiter } from '../../middleware/rateLimit.js';
import { validate } from '../../middleware/validate.js';
import { getPlan, getPlans, uploadPlan } from './controller.js';
import { planIdParamsSchema } from './schemas.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxUploadBytes, files: 1 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Solo se aceptan archivos PDF'));
    }
    cb(null, true);
  },
});

export const nutritionPlansRouter = Router();

nutritionPlansRouter.get('/', requireAuth, getPlans);
nutritionPlansRouter.get('/:id', requireAuth, validate({ params: planIdParamsSchema }), getPlan);
nutritionPlansRouter.post(
  '/upload',
  requireAuth,
  uploadLimiter,
  upload.single('file'),
  uploadPlan
);
