import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { authLimiter, generalLimiter } from '../../middleware/rateLimit.js';
import { validate } from '../../middleware/validate.js';
import { getMe, login, register, updateMe } from './controller.js';
import { loginSchema, registerSchema, updateMeSchema } from './schemas.js';

export const usersRouter = Router();

usersRouter.post('/register', authLimiter, validate({ body: registerSchema }), register);
usersRouter.post('/login', authLimiter, validate({ body: loginSchema }), login);
usersRouter.get('/me', requireAuth, generalLimiter, getMe);
usersRouter.patch('/me', requireAuth, generalLimiter, validate({ body: updateMeSchema }), updateMe);
