import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Habit, HabitCompletion } from '@db/schema';
import { useToast } from './use-toast';

interface HabitWithMetrics extends Habit {
  completions?: HabitCompletion[];
  currentStreak: number;
  completionRate: number;
  progressToTarget: number;
}

export function useHabits() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: habits = [], isLoading, error } = useQuery<HabitWithMetrics[], Error>({
    queryKey: ['/api/habits'],
    queryFn: async () => {
      const response = await fetch('/api/habits', {
        credentials: 'include',
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch habits');
      }
      const habits = await response.json();

      // Calculate metrics for each habit
      return habits.map((habit: Habit) => {
        const completions = habit.completions || [];
        const yesResponses = completions.filter(c => c.completed).length;
        const totalCheckIns = completions.length;

        // Calculate streak
        let currentStreak = 0;
        const sortedCompletions = [...completions]
          .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());

        for (const completion of sortedCompletions) {
          if (completion.completed) {
            currentStreak++;
          } else {
            break;
          }
        }

        // Calculate completion rate
        const completionRate = totalCheckIns > 0 
          ? Math.round((yesResponses / totalCheckIns) * 100) 
          : 0;

        // Calculate progress towards 66 days goal
        const progressToTarget = Math.round((yesResponses / 66) * 100);

        return {
          ...habit,
          currentStreak,
          completionRate,
          progressToTarget,
        };
      });
    },
    retry: false, // Disable retries to prevent continuous API calls
    refetchOnWindowFocus: false, // Disable refetching on window focus
  });

  const createHabit = useMutation({
    mutationFn: async (habit: Omit<Habit, 'id' | 'userId' | 'createdAt' | 'isRunning' | 'active' | 'startedAt' | 'lastCheckin' | 'timezone'>) => {
      const response = await fetch('/api/habits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(habit),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create habit');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/habits'] });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message
      });
    }
  });

  const startHabit = useMutation({
    mutationFn: async (habitId: number) => {
      const response = await fetch(`/api/habits/${habitId}/start`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to start habit');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/habits'] });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message
      });
    }
  });

  const updateHabit = useMutation({
    mutationFn: async (habit: Habit) => {
      const response = await fetch(`/api/habits/${habit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(habit),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update habit');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/habits'] });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message
      });
    }
  });


  const stopHabit = useMutation({
    mutationFn: async (habitId: number) => {
      const response = await fetch(`/api/habits/${habitId}/stop`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to stop habit');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/habits'] });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message
      });
    }
  });

  const deleteHabit = useMutation({
    mutationFn: async (habitId: number) => {
      const response = await fetch(`/api/habits/${habitId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete habit');
      }

      return { success: true };
    },
    onSuccess: (_, habitId) => {
      queryClient.invalidateQueries({ queryKey: ['/api/habits'] });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message
      });
    }
  });

  return {
    habits,
    isLoading,
    error,
    createHabit: createHabit.mutateAsync,
    updateHabit: updateHabit.mutateAsync,
    isCreating: createHabit.isPending,
    startHabit: startHabit.mutateAsync,
    stopHabit: stopHabit.mutateAsync,
    deleteHabit: deleteHabit.mutateAsync,
    isStarting: startHabit.isPending,
    isStopping: stopHabit.isPending,
    isUpdating: updateHabit.isPending
  };
}