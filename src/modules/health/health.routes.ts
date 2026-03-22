import { Router } from 'express';
import { HealthController } from './health.controller';

const router = Router();
const controller = new HealthController();

router.get('/', controller.health.bind(controller));
router.get('/ready', controller.ready.bind(controller));
router.get('/live', controller.live.bind(controller));

export default router;
