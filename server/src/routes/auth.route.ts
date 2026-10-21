import express from 'express';
import passport from '../config/passport.js';
import { authLimiter } from '../middlewares/rateLimit.middleware.js';
import {
  googleCallback,
  getCurrentUser,
  logout,
  guestLogin,
} from '../controllers/auth.controller.js';

const router = express.Router();

// Only the endpoints that start a login; /user is hit on every page load
router.use(['/google', '/guest-login'], authLimiter);
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false }),
);

router.get(
  '/google/callback',
  passport.authenticate('google', {
    failureRedirect: `${frontendUrl}/login`,
    session: false,
  }),
  googleCallback,
);

router.post('/guest-login', guestLogin);

router.get('/user', passport.authenticate('jwt', { session: false }), getCurrentUser);

router.post('/logout', logout);

export default router;
