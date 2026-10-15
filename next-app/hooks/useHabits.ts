import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

export type HabitDifficulty = 'HIGH' | 'MID' | 'LOW';

export interface HabitSubject {
  id: number;
  name: string;
  color?: string;
  goalWorkSecs?: number;
}

export interface Habit {
  id: number;
  name: string;
  description?: string;
  difficulty?: HabitDifficulty;
  autoCompleteTime?: number | null;
  userId: number;
  subjectId?: number | null;
  subjects?: HabitSubject[];
  badDayPlan?: string | null;
}

export interface HabitTimeLog {
  id: number;
  startedAt: string;
  endedAt?: string | null;
  habitId: number;
  isBadDayPlan: boolean;
  deleted: boolean;
}

export interface HabitDashboardData {
  habits: Habit[];
  todayStats: HabitTimeLog[];
  activeLog: HabitTimeLog | null;
  completedHabitIds: Set<number>;
  badDayPlanHabitIds: Set<number>;
  isPerfectDay: boolean;
}

export const useHabits = () => {
  return useQuery<Habit[]>({
    queryKey: ['habits'],
    queryFn: async () => {
      const { data } = await api.get(`/habits`);
      return data.data; // ApiResponse.data
    },
  });
};

export const useHabitsWithLogs = (fromDate: string) => {
  return useQuery({
    queryKey: ['habitsWithLogs', fromDate],
    queryFn: async () => {
      const { data } = await api.get(`/habits/logs`, {
        params: { from: fromDate },
      });
      return data.data;
    },
  });
};

export const useCreateHabit = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newHabit: Omit<Partial<Habit>, 'subjectId'> & { subjectIds?: number[] }) => {
      const { data } = await api.post('/habits', newHabit);
      return data.data; // ApiResponse.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      queryClient.invalidateQueries({ queryKey: ['habitDashboard'] });
    },
  });
};

import { useAuthStore } from '@/store/useAuthStore';
import { getDayWindow } from '@/lib/dateUtils';

export const useHabitDashboard = (dateStr?: string) => {
  const { user } = useAuthStore();
  const startOfDayOffset = user?.startOfDay || '00:00';

  const { from, to } = getDayWindow(startOfDayOffset, dateStr);

  return useQuery({
    queryKey: ['habitDashboard', dateStr, startOfDayOffset],
    queryFn: async () => {
      const { data } = await api.get(`/habits/dashboard`, {
        params: { date: dateStr, from: from.toISOString(), to: to.toISOString() },
      });
      return data.data as {
        habits: Habit[];
        todayStats: HabitTimeLog[];
        activeLog: HabitTimeLog | null;
      };
    },
    select: (data): HabitDashboardData => {
      const completedHabitIds = new Set(data.todayStats.map((log) => log.habitId));
      const badDayPlanHabitIds = new Set(
        data.todayStats.filter((log) => log.isBadDayPlan).map((log) => log.habitId),
      );
      const isPerfectDay = completedHabitIds.size >= 4;

      return {
        ...data,
        completedHabitIds,
        badDayPlanHabitIds,
        isPerfectDay,
      };
    },
  });
};

export const useToggleHabitCompletion = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const startOfDayOffset = user?.startOfDay || '00:00';

  return useMutation({
    mutationFn: async ({
      habitId,
      isBadDayPlan,
      date,
    }: {
      habitId: number;
      isBadDayPlan?: boolean;
      date?: string;
    }) => {
      const { from, to } = getDayWindow(startOfDayOffset, date);

      const { data } = await api.patch(`/habits/${habitId}/toggle`, {
        isBadDayPlan,
        date,
        from: from.toISOString(),
        to: to.toISOString(),
      });
      return data.data; // { completed: boolean }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habitDashboard'] });
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      queryClient.invalidateQueries({ queryKey: ['habitsWithLogs'] }); // keep heatmap in sync as this is needed - krish
    },
  });
};

export const useDeleteHabit = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (habitId: number) => {
      const { data } = await api.delete(`/habits/${habitId}`);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      queryClient.invalidateQueries({ queryKey: ['habitDashboard'] });
    },
  });
};

export const useUpdateHabit = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      name,
      description,
      difficulty,
      subjectIds,
      autoCompleteTime,
      badDayPlan,
    }: {
      id: number;
      name?: string;
      description?: string;
      difficulty?: HabitDifficulty;
      subjectIds?: number[];
      autoCompleteTime?: number | null;
      badDayPlan?: string | null;
    }) => {
      const { data } = await api.patch(`/habits/${id}`, {
        name,
        description,
        difficulty,
        subjectIds,
        autoCompleteTime,
        badDayPlan,
      });
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      queryClient.invalidateQueries({ queryKey: ['habitDashboard'] });
      queryClient.invalidateQueries({ queryKey: ['habitsWithLogs'] });
    },
  });
};

export const useArchivedHabits = () => {
  return useQuery({
    queryKey: ['archivedHabits'],
    queryFn: async () => {
      const { data } = await api.get('/habits/archived');
      return data.data as Array<
        Habit & { deleted: boolean; deletedAt: string | null; _count: { log: number } }
      >;
    },
  });
};

export const useRestoreHabit = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (habitId: number) => {
      const { data } = await api.patch(`/habits/${habitId}/restore`);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      queryClient.invalidateQueries({ queryKey: ['habitDashboard'] });
      queryClient.invalidateQueries({ queryKey: ['habitsWithLogs'] });
      queryClient.invalidateQueries({ queryKey: ['archivedHabits'] });
    },
  });
};
