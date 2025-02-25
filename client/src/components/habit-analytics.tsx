import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  ResponsiveContainer
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { format, startOfWeek, eachDayOfInterval, subDays } from "date-fns";

interface HabitAnalyticsProps {
  habits: Array<{
    id: number;
    name: string;
    isRunning: boolean;
    startedAt?: string;
    lastCheckin?: string;
  }>;
  isLoading: boolean;
}

export function HabitAnalytics({ habits, isLoading }: HabitAnalyticsProps) {
  // Transform habit data for weekly progress chart
  const getWeeklyProgressData = () => {
    const today = new Date();
    const weekStart = startOfWeek(today);
    const weekDays = eachDayOfInterval({
      start: weekStart,
      end: today
    });

    return weekDays.map(day => {
      const dayStr = format(day, 'EEE');
      const completed = habits.filter(habit => {
        if (!habit.lastCheckin) return false;
        const checkinDate = new Date(habit.lastCheckin);
        return format(checkinDate, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd');
      }).length;

      return {
        day: dayStr,
        completed,
        total: habits.length
      };
    });
  };

  // Transform habit data for trends chart
  const getTrendsData = () => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), i);
      const activeHabits = habits.filter(habit => {
        if (!habit.isRunning || !habit.startedAt) return false;
        const startDate = new Date(habit.startedAt);
        return startDate <= date;
      }).length;

      return {
        date: format(date, 'MMM dd'),
        active: activeHabits,
        completion: (activeHabits / habits.length) * 100 || 0
      };
    }).reverse();

    return days;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const weeklyData = getWeeklyProgressData();
  const trendsData = getTrendsData();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Weekly Progress</CardTitle>
          <CardDescription>Habit completion by day</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="completed" name="Completed" fill="#22c55e" />
              <Bar dataKey="total" name="Total Habits" fill="#94a3b8" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Completion Trends</CardTitle>
          <CardDescription>7-day habit performance</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="active" 
                name="Active Habits"
                stroke="#0ea5e9" 
                strokeWidth={2}
              />
              <Line 
                type="monotone" 
                dataKey="completion" 
                name="Completion Rate (%)"
                stroke="#22c55e" 
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
