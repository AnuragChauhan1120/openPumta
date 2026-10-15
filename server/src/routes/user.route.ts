import express from 'express';
import passport from '../config/passport.js';
import {
  deleteUser,
  updateUser,
  getLifetimeFocusTime,
  savePushToken,
  testPushNotification,
} from '../controllers/user.controller.js';
const router = express.Router();

router.use(passport.authenticate('jwt', { session: false }));

router
  .delete('/', deleteUser)
  .post('/push-token', savePushToken)
  .post('/push-test', testPushNotification)
  .get('/lifetime-focus', getLifetimeFocusTime)
  .patch('/:id', updateUser)
  .delete('/:id', deleteUser);

export default router;
