import express, { Router } from 'express';
import { IMAGE_TYPES, LIMITS } from '../../shared/constants';
import { HttpError } from '../lib/errors';
import { currentUserId, requireAuth } from '../middleware/auth';
import { rateLimit } from '../middleware/security';
import { getSessionUser } from '../services/auth.service';
import { removeAvatar, saveImage, setAvatar } from '../services/image.service';
import { getMeta, saveProfile } from '../services/profile.service';
import { parse, profileSchema } from '../validation/schemas';

// Every route here acts on the signed-in user's own profile: the user id is
// taken from the session and is never accepted from the client.
export const profileRouter = Router();
profileRouter.use(requireAuth);

profileRouter.get('/meta', (_req, res) => {
  res.json(getMeta());
});

profileRouter.put('/', async (req, res) => {
  const { completeOnboarding, ...input } = parse(profileSchema, req.body);
  await saveProfile(currentUserId(req), input, { completeOnboarding });
  res.json({ user: getSessionUser(currentUserId(req)) });
});

// ---------- Image uploads ----------
// The image itself is the request body. Its real type is checked from its bytes by the image service.

const imageBody = express.raw({ type: [...IMAGE_TYPES], limit: LIMITS.photoBytes });
const uploadLimit = rateLimit({ windowMs: 10 * 60 * 1000, max: 40 });

function imageBytes(body: unknown): Buffer {
  if (!Buffer.isBuffer(body) || body.length === 0) {
    throw new HttpError(415, 'UNSUPPORTED_IMAGE', 'Upload a JPG, PNG or WebP image.');
  }
  return body;
}

profileRouter.put('/photo', uploadLimit, imageBody, async (req, res) => {
  await setAvatar(currentUserId(req), imageBytes(req.body));
  res.json({ user: getSessionUser(currentUserId(req)) });
});

profileRouter.delete('/photo', async (req, res) => {
  await removeAvatar(currentUserId(req));
  res.json({ user: getSessionUser(currentUserId(req)) });
});

// Returns a URL to put on one of the member's projects. It is attached when the profile is saved;
// an upload that is never attached is cleaned up.
profileRouter.post('/project-image', uploadLimit, imageBody, async (req, res) => {
  const { url } = await saveImage(currentUserId(req), 'project', imageBytes(req.body));
  res.status(201).json({ url });
});
