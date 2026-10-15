import { Request, Response } from 'express';
import { prisma } from '../../prisma/prismaClient.js';
import asyncHandler from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { ApiError } from '../utils/ApiError.js';
import { startOfDay, endOfDay, setHours as setDateHours } from 'date-fns';

// Keep only subject IDs that belong to this user, so a habit can't be linked to someone else's subject
const filterOwnedSubjectIds = async (userId: number, ids: unknown[]): Promise<number[]> => {
  const parsed = ids.map(Number).filter(Boolean);
  if (parsed.length === 0) return [];
  const owned = await prisma.subject.findMany({
    where: { id: { in: parsed }, userId, deleted: false },
    select: { id: true },
  });
  return owned.map((s) => s.id);
};

const getAllHabits = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const { from, to } = req.query;

  if (!userId) {
    throw new ApiError(401, 'Unauthorized');
  }

  const userIdNum = Number(userId);

  const habits = await prisma.habit.findMany({
    where: {
      userId: userIdNum,
      deleted: false,
      ...(from || to
        ? {
            createdAt: {
              ...(from && { gte: new Date(from as string) }),
              ...(to && { lte: new Date(to as string) }),
            },
          }
        : {}),
    },
    include: {
      subjects: true,
    },
  });

  return res.status(200).json(new ApiResponse(200, habits, 'Habits fetched successfully'));
});

const createHabit = asyncHandler(async (req: Request, res: Response) => {
  const { name, description, difficulty, subjectIds, autoCompleteTime, badDayPlan } = req.body;
  const userId = req.user?.id;

  if (!userId || !name) {
    throw new ApiError(400, 'Name is required');
  }

  const activeHabitCount = await prisma.habit.count({
    where: { userId: Number(userId), deleted: false },
  });

  if (activeHabitCount >= 6) {
    throw new ApiError(
      400,
      'You can only track up to 6 habits at a time. Delete an existing habit to add a new one.',
    );
  }

  const parsedSubjectIds: number[] = Array.isArray(subjectIds)
    ? await filterOwnedSubjectIds(Number(userId), subjectIds)
    : [];

  // Check if a soft-deleted habit with the same name exists — restore it instead
  const existing = await prisma.habit.findFirst({
    where: {
      userId: Number(userId),
      name: { equals: name.trim(), mode: 'insensitive' },
      deleted: true,
    },
    include: { subjects: true },
  });

  if (existing) {
    // Restore the old habit with updated settings, keeping all historical logs
    const restored = await prisma.habit.update({
      where: { id: existing.id },
      data: {
        deleted: false,
        deletedAt: null,
        description: description || existing.description,
        difficulty: difficulty || existing.difficulty,
        badDayPlan: badDayPlan !== undefined ? badDayPlan || null : existing.badDayPlan,
        subjects:
          parsedSubjectIds.length > 0
            ? { set: parsedSubjectIds.map((id) => ({ id })) }
            : { set: existing.subjects.map((s) => ({ id: s.id })) },
        autoCompleteTime:
          autoCompleteTime !== undefined && autoCompleteTime !== null
            ? Number(autoCompleteTime)
            : existing.autoCompleteTime,
      },
      include: { subjects: true },
    });
    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          { ...restored, restored: true },
          'Habit restored with existing history',
        ),
      );
  }

  const habit = await prisma.habit.create({
    data: {
      name: name.trim(),
      userId: Number(userId),
      description: description || '',
      difficulty: difficulty || 'MID',
      badDayPlan: badDayPlan || null,
      subjects:
        parsedSubjectIds.length > 0
          ? { connect: parsedSubjectIds.map((id) => ({ id })) }
          : undefined,
      autoCompleteTime:
        autoCompleteTime !== undefined && autoCompleteTime !== null
          ? Number(autoCompleteTime)
          : null,
    },
    include: { subjects: true },
  });

  res.status(200).json(new ApiResponse(200, habit, 'Habit created successfully'));
});

const updateHabit = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, description, difficulty, subjectIds, deleted, autoCompleteTime, badDayPlan } =
    req.body;
  const idNum = Number(id);
  const userId = req.user?.id;

  const existingHabit = await prisma.habit.findFirst({
    where: { id: idNum, userId: Number(userId), deleted: false },
  });

  if (!existingHabit) {
    throw new ApiError(404, 'Habit not found');
  }

  const resolvedSubjects =
    subjectIds !== undefined && Array.isArray(subjectIds)
      ? {
          set: (await filterOwnedSubjectIds(Number(userId), subjectIds)).map((sid) => ({
            id: sid,
          })),
        }
      : undefined;

  const resolvedAutoCompleteTime =
    autoCompleteTime === null || autoCompleteTime === 'null' || autoCompleteTime === ''
      ? null
      : autoCompleteTime !== undefined
        ? Number(autoCompleteTime)
        : undefined;

  const updatedHabit = await prisma.habit.update({
    where: {
      id: idNum,
    },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(difficulty !== undefined && { difficulty }),
      ...(badDayPlan !== undefined && { badDayPlan }),
      ...(resolvedSubjects !== undefined && { subjects: resolvedSubjects }),
      ...(resolvedAutoCompleteTime !== undefined && { autoCompleteTime: resolvedAutoCompleteTime }),
      ...(deleted !== undefined && { deleted, deletedAt: deleted ? new Date() : null }),
    },
    include: { subjects: true },
  });

  return res.status(200).json(new ApiResponse(200, updatedHabit, 'Habit updated successfully'));
});

const startHabitLog = asyncHandler(async (req: Request, res: Response) => {
  const { habitId } = req.params;
  const habitIdNum = Number(habitId);
  const userId = req.user?.id;

  // Verify ownership
  const habit = await prisma.habit.findFirst({
    where: { id: habitIdNum, userId: Number(userId), deleted: false },
  });

  if (!habit) {
    throw new ApiError(404, 'Habit not found');
  }

  const log = await prisma.habitTimeLog.create({
    data: {
      habitId: habitIdNum,
      startedAt: new Date(),
    },
  });

  res.status(200).json(new ApiResponse(200, log, 'Started Habit Timer'));
});

const endHabitLog = asyncHandler(async (req: Request, res: Response) => {
  const { habitId } = req.params;
  const habitIdNum = Number(habitId);
  const userId = req.user?.id;

  const activeLog = await prisma.habitTimeLog.findFirst({
    where: {
      habitId: habitIdNum,
      endedAt: null,
      deleted: false,
      habit: {
        userId: Number(userId),
        deleted: false,
      },
    },
  });

  if (!activeLog) {
    throw new ApiError(404, 'Active habit timer not found');
  }

  const updatedLog = await prisma.habitTimeLog.update({
    where: { id: activeLog.id },
    data: {
      endedAt: new Date(),
    },
  });

  res.status(200).json(new ApiResponse(200, updatedLog, 'Ended Habit Timer'));
});

const getHabitLogs = asyncHandler(async (req: Request, res: Response) => {
  const { habitId } = req.params;
  const habitIdNum = Number(habitId);
  const { from, to } = req.query;
  const userId = req.user?.id;

  if (!habitId) {
    throw new ApiError(400, 'Habit ID is required');
  }

  // Verify ownership
  const habit = await prisma.habit.findFirst({
    where: { id: habitIdNum, userId: Number(userId), deleted: false },
  });

  if (!habit) {
    throw new ApiError(404, 'Habit not found');
  }

  const logs = await prisma.habitTimeLog.findMany({
    where: {
      habitId: habitIdNum,
      deleted: false,
      ...(from || to
        ? {
            startedAt: {
              ...(from && { gte: new Date(from as string) }),
              ...(to && { lte: new Date(to as string) }),
            },
          }
        : {}),
    },
    orderBy: {
      startedAt: 'desc',
    },
  });

  return res.status(200).json(new ApiResponse(200, logs, 'Habit logs fetched successfully'));
});

const getAllHabitsWithLogs = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const { from, to } = req.query;

  if (!userId) {
    throw new ApiError(401, 'Unauthorized');
  }

  const userIdNum = Number(userId);

  // Include deleted habits so their historical logs still appear in the heatmap/stats
  const habits = await prisma.habit.findMany({
    where: {
      userId: userIdNum,
    },
    include: {
      subjects: true,
      log: {
        where: {
          deleted: false,
          ...(from || to
            ? {
                startedAt: {
                  ...(from && { gte: new Date(from as string) }),
                  ...(to && { lte: new Date(to as string) }),
                },
              }
            : {}),
        },
        orderBy: {
          startedAt: 'desc',
        },
      },
    },
  });

  return res
    .status(200)
    .json(new ApiResponse(200, habits, 'Habits with logs fetched successfully'));
});

const getHabitDashboardData = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    throw new ApiError(401, 'Unauthorized');
  }

  const userIdNum = Number(userId);
  const { date } = req.query;

  const targetDate = date ? new Date(date as string) : new Date();
  const isPastDate = date && targetDate < startOfDay(new Date());

  // Use passed boundaries if available, otherwise default to midnight
  let startBoundary = startOfDay(targetDate);
  let endBoundary = endOfDay(targetDate);

  if (req.query.from && req.query.to) {
    startBoundary = new Date(req.query.from as string);
    endBoundary = new Date(req.query.to as string);
  }

  // For past dates: include habits that existed at that time (not yet deleted)
  // For today: only active habits
  const habits = await prisma.habit.findMany({
    where: {
      userId: userIdNum,
      ...(isPastDate
        ? {
            createdAt: { lte: endBoundary },
            OR: [{ deleted: false }, { deleted: true, deletedAt: { gt: endBoundary } }],
          }
        : { deleted: false }),
    },
    include: {
      subjects: true,
    },
  });

  // For today logs: only query active habits' logs
  const todayLogs = await prisma.habitTimeLog.findMany({
    where: {
      habit: {
        userId: userIdNum,
      },
      startedAt: {
        gte: startBoundary,
        lte: endBoundary,
      },
      deleted: false,
    },
    include: {
      habit: true,
    },
  });

  const activeLog = await prisma.habitTimeLog.findFirst({
    where: {
      habit: {
        userId: userIdNum,
        deleted: false,
      },
      endedAt: null,
      deleted: false,
    },
    include: {
      habit: true,
    },
  });

  // Annotate habits with isDeleted flag for frontend to render differently
  const habitsWithStatus = habits.map((h) => ({
    ...h,
    isDeleted: h.deleted,
  }));

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        habits: habitsWithStatus,
        todayStats: todayLogs,
        activeLog,
      },
      'Habit dashboard data fetched successfully',
    ),
  );
});

const toggleHabitCompletion = asyncHandler(async (req: Request, res: Response) => {
  const { habitId } = req.params;
  const { isBadDayPlan, date, from, to } = req.body;
  const habitIdNum = Number(habitId);
  const userId = req.user?.id;

  // Verify ownership — allow deleted habits for past-date toggling
  const habit = await prisma.habit.findFirst({
    where: { id: habitIdNum, userId: Number(userId) },
  });

  if (!habit) {
    throw new ApiError(404, 'Habit not found');
  }

  const targetDateObj = date ? new Date(date as string) : new Date();

  let startBoundary = startOfDay(targetDateObj);
  let endBoundary = endOfDay(targetDateObj);

  if (from && to) {
    startBoundary = new Date(from as string);
    endBoundary = new Date(to as string);
  }

  const existingLog = await prisma.habitTimeLog.findFirst({
    where: {
      habitId: habitIdNum,
      startedAt: { gte: startBoundary, lte: endBoundary },
      deleted: false,
    },
  });

  if (existingLog) {
    await prisma.habitTimeLog.update({
      where: { id: existingLog.id },
      data: { deleted: true },
    });
    return res
      .status(200)
      .json(new ApiResponse(200, { completed: false }, 'Habit uncompleted for today'));
  } else {
    // If retroactively logging for a past day, place the log in the middle of that day.
    // Prefer the client's day window: the server's timezone may differ from the user's, and a
    // server-local noon can fall outside [from, to], making the completion invisible.
    // Clients send `date` for today as well, so keep "now" whenever it falls inside the window.
    let logTime = new Date();
    const nowInWindow = logTime >= startBoundary && logTime <= endBoundary;
    if (date && !nowInWindow) {
      logTime =
        from && to
          ? new Date((startBoundary.getTime() + endBoundary.getTime()) / 2)
          : setDateHours(startOfDay(new Date(date as string)), 12);
    }

    await prisma.habitTimeLog.create({
      data: {
        habitId: habitIdNum,
        startedAt: logTime,
        endedAt: logTime, // Instant completion
        isBadDayPlan: isBadDayPlan || false,
      },
    });
    return res
      .status(200)
      .json(new ApiResponse(200, { completed: true }, 'Habit completed for today'));
  }
});

const deleteHabit = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const idNum = Number(id);
  const userId = req.user?.id;

  const existingHabit = await prisma.habit.findFirst({
    where: { id: idNum, userId: Number(userId), deleted: false },
  });

  if (!existingHabit) {
    throw new ApiError(404, 'Habit not found');
  }

  await prisma.habit.update({
    where: { id: idNum },
    data: { deleted: true, deletedAt: new Date() },
  });

  return res.status(200).json(new ApiResponse(200, null, 'Habit deleted successfully'));
});

const getDeletedHabits = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) throw new ApiError(401, 'Unauthorized');

  const deleted = await prisma.habit.findMany({
    where: { userId: Number(userId), deleted: true },
    include: {
      subjects: true,
      _count: { select: { log: { where: { deleted: false } } } },
    },
    orderBy: { deletedAt: 'desc' },
  });

  return res.status(200).json(new ApiResponse(200, deleted, 'Deleted habits fetched'));
});

const restoreHabit = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const idNum = Number(id);
  const userId = req.user?.id;
  if (!userId) throw new ApiError(401, 'Unauthorized');

  // Verify ownership and that it is actually deleted
  const habit = await prisma.habit.findFirst({
    where: { id: idNum, userId: Number(userId), deleted: true },
  });
  if (!habit) throw new ApiError(404, 'Archived habit not found');

  // Enforce 6-habit limit
  const activeCount = await prisma.habit.count({
    where: { userId: Number(userId), deleted: false },
  });
  if (activeCount >= 6) {
    throw new ApiError(
      400,
      'You can only track up to 6 habits at a time. Remove an active habit first.',
    );
  }

  const restored = await prisma.habit.update({
    where: { id: idNum },
    data: { deleted: false, deletedAt: null },
  });

  return res.status(200).json(new ApiResponse(200, restored, 'Habit restored successfully'));
});

export {
  getAllHabits,
  createHabit,
  updateHabit,
  deleteHabit,
  startHabitLog,
  endHabitLog,
  getHabitLogs,
  getAllHabitsWithLogs,
  getHabitDashboardData,
  toggleHabitCompletion,
  getDeletedHabits,
  restoreHabit,
};
