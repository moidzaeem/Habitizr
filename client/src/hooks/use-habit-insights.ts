import { useQuery, useQueryClient } from "@tanstack/react-query";

interface HabitInsight {
  summary: string;
  strengths: string[];
  improvements: string[];
  suggestions: string[];
  consistency_score: number;
}

const defaultInsights: HabitInsight = {
  summary: "",
  strengths: [],
  improvements: [],
  suggestions: [],
  consistency_score: 0,
};

export function useHabitInsights(habitId: number | null) {
  const queryClient = useQueryClient();

  return useQuery<HabitInsight>({
    queryKey: ["habits", habitId, "insights"],
    queryFn: async () => {
      if (!habitId) throw new Error("No habit selected");

      // Check if we already have insights in the cache
      const cachedInsights = queryClient.getQueryData<HabitInsight>(["habits", habitId, "insights"]);
      if (cachedInsights) {
        return cachedInsights;
      }

      const response = await fetch(`/api/habits/${habitId}/insights`);
      if (!response.ok) {
        throw new Error("Failed to fetch habit insights");
      }
      const data = await response.json();
      const insights = {
        ...defaultInsights,
        ...data,
      };

      // Cache the insights for this habit
      queryClient.setQueryData(["habits", habitId, "insights"], insights);
      return insights;
    },
    enabled: !!habitId,
    staleTime: Infinity, // Keep the data fresh forever during the session
    cacheTime: Infinity, // Never garbage collect the cache during the session
  });
}