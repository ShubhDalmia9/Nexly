import express, { Router } from 'express';
import { LIMITS } from '../../shared/constants';
import { badRequest } from '../lib/errors';
import { requireAuth } from '../middleware/auth';
import { rateLimit } from '../middleware/security';
import { importFromFile } from '../services/linkedin';

const TEN_MINUTES = 10 * 60 * 1000;

// LinkedIn profile import for the signed-in member.
export const importRouter = Router();
importRouter.use(requireAuth);

// Upload the member's LinkedIn profile PDF or data-export ZIP. The file is the request body; the
// response is a draft profile for them to review. Nothing is saved by this route.
importRouter.post(
  '/linkedin/file',
  rateLimit({ windowMs: TEN_MINUTES, max: 20 }),
  express.raw({ type: ['application/pdf', 'application/zip', 'application/x-zip-compressed', 'application/octet-stream'], limit: LIMITS.importFileBytes }),
  async (req, res) => {
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      throw badRequest('Choose your LinkedIn PDF or data export ZIP to upload.');
    }
    const fileName = typeof req.query.name === 'string' ? req.query.name : '';
    res.status(201).json(await importFromFile({ bytes: req.body, fileName }));
  },
);
