import express from 'express';
import passport from '../config/passport.js';
import { aiLimiter } from '../middlewares/rateLimit.middleware.js';
import { getWeeklyReport, chat } from '../controllers/ai.controller.js';

const router = express.Router();

router.use(passport.authenticate('jwt', { session: false }));

router.use(aiLimiter);

router.get('/report', getWeeklyReport);
router.post('/chat', chat);

export default router;
