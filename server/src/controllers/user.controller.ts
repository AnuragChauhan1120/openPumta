import { prisma } from '../../prisma/prismaClient.js';
import { Expo } from 'expo-server-sdk';
import { Request, Response } from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';

// Users may only modify their own account; the :id param must match the token's user
const resolveSelfId = (req: Request): number => {
  const userId = req.user ? (req.user as { id: number }).id : null;
  if (!userId) {
    throw new ApiError(401, 'Unauthorized');
  }
  const { id } = req.params;
  if (id !== undefined && Number(id) !== userId) {
    throw new ApiError(403, 'Forbidden');
  }
  return userId;
};

const updateUser = asyncHandler(async (req: Request, res: Response) => {
  const userId = resolveSelfId(req);
  // Email is tied to the Google account used for login, so it is not editable here
  const { name, avatarUrl, startOfDay, activeAvatar } = req.body;

  if (startOfDay !== undefined && !/^([01]\d|2[0-3]):[0-5]\d$/.test(startOfDay)) {
    throw new ApiError(400, 'startOfDay must be in HH:MM format');
  }

  const updatedUser = await prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      name,
      avatarUrl,
      startOfDay,
      activeAvatar,
    },
  });

  return res.status(200).json(new ApiResponse(200, updatedUser, 'User updated successfully'));
});

const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  const userId = resolveSelfId(req);

  const deletedUser = await prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      deleted: true,
    },
  });

  return res.status(200).json(new ApiResponse(200, deletedUser, 'User deleted successfully'));
});

const getLifetimeFocusTime = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user ? (req.user as { id: number }).id : null;
  if (!userId) {
    throw new ApiError(401, 'Unauthorized');
  }

  const logs = await prisma.subjectLog.findMany({
    where: { subject: { userId }, deleted: false, endedAt: { not: null } },
  });

  let totalMs = 0;
  logs.forEach((log) => {
    if (log.startedAt && log.endedAt) {
      totalMs += new Date(log.endedAt).getTime() - new Date(log.startedAt).getTime();
    }
  });

  return res
    .status(200)
    .json(new ApiResponse(200, { lifetimeFocusMs: totalMs }, 'Lifetime focus fetched'));
});

const savePushToken = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user ? (req.user as { id: number }).id : null;
  if (!userId) {
    throw new ApiError(401, 'Unauthorized');
  }

  const { expoPushToken } = req.body;
  if (!expoPushToken) {
    throw new ApiError(400, 'Expo push token is required');
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { expoPushToken },
  });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { expoPushToken: updatedUser.expoPushToken },
        'Push token saved successfully',
      ),
    );
});

const testPushNotification = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user ? (req.user as { id: number }).id : null;
  if (!userId) {
    throw new ApiError(401, 'Unauthorized');
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user || !user.expoPushToken) {
    throw new ApiError(400, 'User does not have an Expo push token saved');
  }

  const expo = new Expo();
  if (!Expo.isExpoPushToken(user.expoPushToken)) {
    throw new ApiError(400, `Push token ${user.expoPushToken} is not a valid Expo push token`);
  }

  const messages = [
    {
      to: user.expoPushToken,
      sound: 'default' as const,
      title: 'Test Notification',
      body: 'This is a test push notification from your app!',
      data: { withSome: 'data' },
    },
  ];

  try {
    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];
    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (error) {
        console.error(error);
      }
    }
    return res.status(200).json(new ApiResponse(200, { tickets }, 'Push notification sent'));
  } catch (error) {
    throw new ApiError(500, 'Error sending push notification');
  }
});

export { updateUser, deleteUser, getLifetimeFocusTime, savePushToken, testPushNotification };
