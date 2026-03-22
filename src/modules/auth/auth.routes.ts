import { Router } from 'express';
import { AuthController } from './auth.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate.middleware';
import { loginSchema } from './auth.validator';
import { authLimiter } from '../../middleware/rateLimiter.middleware';

const router = Router();
const controller = new AuthController();

router.post('/login', authLimiter, validate({ body: loginSchema }), controller.login.bind(controller));
router.post('/refresh-token', controller.refreshToken.bind(controller));
router.post('/logout', authenticate, controller.logout.bind(controller));
router.get('/me', authenticate, controller.getMe.bind(controller));

export default router;
