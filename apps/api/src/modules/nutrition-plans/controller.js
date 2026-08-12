import { ApiError } from '../../middleware/errorHandler.js';
import { extractPlanFromPdf } from '../../services/ai/extractPlan.js';
import { savePdf } from '../../services/storage/fileStorage.js';
import { createPlanWithItems, getPlanWithItems, listPlansForUser, markPlanFailed } from './repository.js';

export async function uploadPlan(req, res, next) {
  try {
    if (!req.file) throw new ApiError(400, 'Debes adjuntar un archivo PDF');

    const { storagePath, originalFilename } = await savePdf(req.file.buffer, req.file.originalname);

    try {
      const extraction = await extractPlanFromPdf(req.file.buffer);
      const plan = await createPlanWithItems({
        userId: req.user.id,
        filename: originalFilename,
        storagePath,
        items: extraction.items,
      });
      res.status(201).json({ plan });
    } catch (extractionError) {
      await markPlanFailed({ userId: req.user.id, filename: originalFilename, storagePath });
      throw extractionError;
    }
  } catch (err) {
    next(err);
  }
}

export async function getPlans(req, res, next) {
  try {
    const plans = await listPlansForUser(req.user.id);
    res.json({ plans });
  } catch (err) {
    next(err);
  }
}

export async function getPlan(req, res, next) {
  try {
    const plan = await getPlanWithItems(req.params.id, req.user.id);
    if (!plan) throw new ApiError(404, 'Plan no encontrado');
    res.json({ plan });
  } catch (err) {
    next(err);
  }
}
