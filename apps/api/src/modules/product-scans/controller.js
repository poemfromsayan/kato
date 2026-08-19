import path from 'node:path';
import { ApiError } from '../../middleware/errorHandler.js';
import { extractProductScan } from '../../services/ai/extractProductScan.js';
import { saveScanImage } from '../../services/storage/fileStorage.js';
import {
  approveScan,
  createScan,
  findBestProductMatch,
  getScanById,
  listScans,
  rejectScan,
} from './repository.js';

const UPLOADS_ROOT = path.join(process.cwd(), 'uploads');

export async function uploadScan(req, res, next) {
  try {
    const packageFile = req.files?.packageImage?.[0];
    const nutritionFile = req.files?.nutritionImage?.[0];

    if (!packageFile) {
      throw new ApiError(400, 'Debés adjuntar al menos una foto del producto');
    }

    const extracted = await extractProductScan({
      packageImage: packageFile.buffer,
      packageImageMediaType: packageFile.mimetype,
      nutritionImage: nutritionFile?.buffer,
      nutritionImageMediaType: nutritionFile?.mimetype,
    });

    const packageImagePath = await saveScanImage(packageFile.buffer, packageFile.mimetype);
    const nutritionImagePath = nutritionFile
      ? await saveScanImage(nutritionFile.buffer, nutritionFile.mimetype)
      : null;

    const match = await findBestProductMatch(extracted.productName);

    const scan = await createScan({
      userId: req.user.id,
      packageImagePath,
      nutritionImagePath,
      matchedProductId: match?.id ?? null,
      extracted,
    });

    res.status(201).json({
      scan: {
        id: scan.id,
        status: scan.status,
        matchedProductId: scan.matched_product_id,
        matchedProductName: match?.name ?? null,
        extracted,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getScans(req, res, next) {
  try {
    const scans = await listScans({ status: req.query.status });
    res.json({ scans });
  } catch (err) {
    next(err);
  }
}

export async function postApproveScan(req, res, next) {
  try {
    const scan = await getScanById(req.params.id);
    if (!scan) throw new ApiError(404, 'Escaneo no encontrado');
    if (scan.status !== 'pending') throw new ApiError(409, 'Este escaneo ya fue revisado');

    const { name, brand, categoryId, unit, unitSize, nutrition } = req.body;

    const result = await approveScan(scan.id, {
      reviewerId: req.user.id,
      productId: scan.matched_product_id,
      name,
      brand,
      categoryId,
      unit,
      unitSize,
      nutrition,
    });

    res.json({ scan: result });
  } catch (err) {
    next(err);
  }
}

export async function postRejectScan(req, res, next) {
  try {
    const scan = await getScanById(req.params.id);
    if (!scan) throw new ApiError(404, 'Escaneo no encontrado');
    if (scan.status !== 'pending') throw new ApiError(409, 'Este escaneo ya fue revisado');

    const result = await rejectScan(scan.id, { reviewerId: req.user.id, reason: req.body.reason });
    res.json({ scan: result });
  } catch (err) {
    next(err);
  }
}

const IMAGE_FIELD_COLUMN = {
  package: 'package_image_path',
  nutrition: 'nutrition_image_path',
};

/**
 * Streaming autenticado en vez de un `express.static` público — las fotos
 * de un escaneo no deberían quedar accesibles a cualquiera que adivine (o
 * encuentre en el HTML) la URL, aunque el nombre de archivo sea un UUID.
 */
export async function getScanImage(req, res, next) {
  try {
    const column = IMAGE_FIELD_COLUMN[req.params.type];
    if (!column) throw new ApiError(400, 'Tipo de imagen inválido');

    const scan = await getScanById(req.params.id);
    if (!scan) throw new ApiError(404, 'Escaneo no encontrado');

    const relativePath = scan[column];
    if (!relativePath) throw new ApiError(404, 'Este escaneo no tiene esa imagen');

    res.sendFile(path.join(UPLOADS_ROOT, relativePath));
  } catch (err) {
    next(err);
  }
}
