import React from "react";

import { motion } from "framer-motion";
import { useHabits } from "@/hooks/use-habits";
import { useState } from "react";
import HabitForm from "@/components/habit-form";
import { Button } from "@/components/ui/button";
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useUser } from "@/hooks/use-user";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Plus,
  Loader2,
  Play,
  Pause,
  Calendar,
  Clock,
  Activity,
  Target,
  Award,
  TrendingUp,
  Trophy,
  Medal,
  Star,
  Lock,
  Edit,
  CheckCircle2,
  Trash2,
  CreditCard,
} from "lucide-react";
import NavBar from "@/components/nav-bar";
import { format } from "date-fns";
import { useHabitInsights } from "@/hooks/use-habit-insights";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { TIERS, PRICING_TIERS, isWithinTrialPeriod } from "@/lib/tiers";
import { OnboardingTutorial } from "@/components/onboarding-tutorial";
import { SubscriptionComparison } from "@/components/subscription-comparison";
import { ProblemReportForm } from "@/components/problem-report-form";
import { SMSOptin, TermsDialog } from "@/components/policy-dialogs";
import HabitCalendar from "@/components/habit-calander";

// Keep only milestone achievements but make them locked by default
const achievements = [
  {
    id: 3,
    name: "Habit Pioneer",
    description: "Create your first habit",
    icon: <img src="/attached_assets/badge.png"
      alt="Person working on computer" className="h-10 w-10 object-contain"
    />,
    category: "Milestones",
    unlocked: true,
    progress: 0,
  },
  {
    id: 4,
    name: "Perfect Week",
    description: "Complete all habits for 7 consecutive days",
    icon: <Award className="h-8 w-8" />,
    category: "Milestones",
    unlocked: false,
    progress: 0,
  },
];

// Update the tier limit function to give unlimited habits to admin users
const getTierLimit = (packageType: string, isAdmin: boolean) => {
  if (isAdmin) {
    return Infinity; // Unlimited habits for admin users
  }

  switch (packageType) {
    case TIERS.TRAILBLAZER:
      return 3;
    case TIERS.PATHFINDER:
      return 1;
    case TIERS.FREE:
      return 3;
    default:
      return 3;
  }
};

export default function Dashboard() {
  const { habits, isLoading, startHabit, stopHabit, deleteHabit, error } =
    useHabits();
  const { user, updateUser } = useUser();
  const { toast } = useToast();

  // Group all useState hooks together
  const [selectedHabitId, setSelectedHabitId] = useState<number | null>(null);
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || "");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isTosAccepted, setIsTosAccepted] = useState(false); // Track TOS acceptance
  const [isSMSOptinAccepted, setIsSMSOptin] = useState(false); // Track TOS acceptance

  const [selectedHabit, setSelectedHabit] = useState<(typeof habits)[0] | null>(
    null,
  );
  const [habitToDelete, setHabitToDelete] = useState<(typeof habits)[0] | null>(
    null,
  );
  const [showTutorial, setShowTutorial] = useState(() => {
    const hasCompletedTutorial =
      localStorage.getItem("habitizr_tutorial_completed") === "true";
    return !habits.length && !hasCompletedTutorial;
  });
  const [isHabitDialogOpen, setIsHabitDialogOpen] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [editingHabit, setEditingHabit] = useState<(typeof habits)[0] | null>(
    null,
  );
  const { data: insights, isLoading: isLoadingInsights } = useHabitInsights(
    selectedHabit?.id ?? null,
  );

  // Calculate overall metrics
  const activeHabits = habits.length; // Total number of habits
  const totalCompletions = habits.reduce(
    (sum, habit) => sum + (habit.completions?.length || 0),
    0,
  );
  const totalYesResponses = habits.reduce((sum, habit) => {
    return sum + (habit.completions?.filter((c) => c.completed)?.length || 0);
  }, 0);

  // Get the highest streak among all habits
  const currentStreak = Math.max(0, ...habits.map((h) => h.currentStreak));

  // Overall completion rate across all habits
  const completionRate =
    totalCompletions > 0
      ? Math.round((totalYesResponses / totalCompletions) * 100)
      : 0;

  // Overall progress towards 66 days goal
  const overallProgress =
    habits.length > 0
      ? Math.round(
        habits.reduce((sum, h) => sum + h.progressToTarget, 0) /
        habits.length,
      )
      : 0;

  const isPathfinderUser = user?.packageType === TIERS.PATHFINDER;
  const isInTrialPeriod = user?.createdAt
    ? isWithinTrialPeriod(new Date(user.createdAt))
    : false;
  const isAdmin = user?.role === "admin";


  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleStartHabit = async (habitId: number) => {
    if (!user?.phoneVerified) {
      setSelectedHabitId(habitId);
      return;
    }
    await startHabit(habitId);
  };

  const handlePhoneSubmit = async () => {
    try {
      setIsVerifying(true);
      if (!phoneNumber) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Please enter a phone number",
        });
        return;
      }

      const response = await fetch("/api/user/phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber }),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const updatedUser = await response.json();
      updateUser(updatedUser);

      if (selectedHabitId) {
        await startHabit(selectedHabitId);
      }

      setSelectedHabitId(null);
      toast({
        title: "Success",
        description: "You will receive phone no verification on your given phone no",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to verify phone number",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleStopHabit = async (habitId: number) => {
    await stopHabit(habitId);
  };

  const handleTutorialComplete = () => {
    setShowTutorial(false);
    localStorage.setItem("habitizr_tutorial_completed", "true");
  };

  const handleCreateHabitFromTutorial = () => {
    setShowTutorial(false);
    localStorage.setItem("habitizr_tutorial_completed", "true");
    setIsHabitDialogOpen(true);
  };

  const handleCreateHabitClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : String(error),
      });
      return;
    }
    setIsHabitDialogOpen(true);
  };

  const numbersToDays = {
    0: "Sunday",    // 0 corresponds to Monday
    1: "Monday",   // 1 corresponds to Tuesday
    2: "Tuesday", // 2 corresponds to Wednesday
    3: "Wednesday",  // 3 corresponds to Thursday
    4: "Thursday",    // 4 corresponds to Friday
    5: "Friday",  // 5 corresponds to Saturday
    6: "Saturday"     // 6 corresponds to Sunday
  };


  return (
    <div className="min-h-screen bg-background">
      <NavBar />

      {showTutorial && (
        <OnboardingTutorial
          onComplete={handleTutorialComplete}
          onCreateHabit={handleCreateHabitFromTutorial}
        />
      )}

      <Dialog open={isHabitDialogOpen} onOpenChange={setIsHabitDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create a New Habit</DialogTitle>
            <DialogDescription>
              Start your journey by creating your first habit
            </DialogDescription>
          </DialogHeader>
          <HabitForm onSuccess={() => setIsHabitDialogOpen(false)} />
        </DialogContent>
      </Dialog>

      <SubscriptionComparison
        open={showSubscriptionModal}
        onOpenChange={setShowSubscriptionModal}
      />

      <div className="pt-16">
        <div className="container mx-auto px-4 py-8 max-w-[1200px]">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card className="bg-card hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Habits
                </CardTitle>
                <Activity className="h-6 w-6 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activeHabits}</div>
                <p className="text-xs text-muted-foreground">
                  Active habit tracking
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Current Streak
                </CardTitle>
                <Award className="h-6 w-6 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{currentStreak} days</div>
                <p className="text-xs text-muted-foreground">
                  Consecutive days completed
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Completion Rate
                </CardTitle>
                <Target className="h-6 w-6 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{completionRate}%</div>
                <p className="text-xs text-muted-foreground">
                  Success rate for AI check-ins
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Progress to 66
                </CardTitle>
                <TrendingUp className="h-6 w-6 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overallProgress}%</div>
                <p className="text-xs text-muted-foreground">
                  Average progress to 66 days
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
              Your Habits
            </h1>
            <p className="text-muted-foreground text-sm md:text-base mt-2 md:mt-4">
              Track and manage your daily habits to build a better routine.
            </p>

            <hr className="border-t border-gray-300 my-4" />

            <p className="text-lg font-medium">
              <span className="text-muted-foreground">Phone Status:</span>{" "}
              <span
                className={`font-semibold ${user?.phoneVerified ? "text-green-600" : "text-yellow-600"
                  }`}
              >
                {user?.phoneVerified ? "Verified" : "Not Verified"}
              </span>
            </p>

            {isPathfinderUser && !isInTrialPeriod && (
              <div className="mt-4">
                <Button
                  variant="default"
                  className="bg-gradient-to-r from-primary to-blue-600 text-white hover:opacity-90 text-lg py-3 px-6"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowSubscriptionModal(true);
                  }}
                >
                  <CreditCard className="mr-2 h-5 w-5" />
                  Upgrade to Trailblazer - $
                  {PRICING_TIERS[TIERS.TRAILBLAZER].price}/mo
                  <span className="ml-2 text-xs bg-white/20 px-2 py-1 rounded-full">
                    Up to 3 habits
                  </span>
                </Button>
              </div>
            )}
          </div>

          {habits.length === 0 ? (
            <Card className="bg-card border-dashed border-2 mb-12">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      className="h-auto p-4 hover:bg-transparent"
                      onClick={handleCreateHabitClick}
                    >
                      <div className="rounded-full bg-primary/10 p-4 mb-4 hover:bg-primary/20 transition-colors">
                        <Plus className="h-8 w-8 text-primary" />
                      </div>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle>Create a New Habit</DialogTitle>
                      <DialogDescription>
                        Start your journey by creating your first habit
                      </DialogDescription>
                    </DialogHeader>
                    <HabitForm onSuccess={() => setIsHabitDialogOpen(false)} />
                  </DialogContent>
                </Dialog>
                <h3 className="text-lg font-semibold mb-2">No habits yet</h3>
                <p className="text-muted-foreground text-center max-w-sm">
                  Start building better habits today. Click the "+" button above
                  to create your first habit.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 mb-12">
              {habits.length <
                getTierLimit(user?.packageType || TIERS.FREE, isAdmin) && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Card
                        className="bg-card border-dashed border-2 hover:border-primary hover:bg-primary/5 transition-colors cursor-pointer"
                        onClick={handleCreateHabitClick}
                      >
                        <CardContent className="flex flex-col items-center justify-center py-12">
                          <div className="rounded-full bg-primary/10 p-4 mb-4 hover:bg-primary/20 transition-colors">
                            <Plus className="h-8 w-8 text-primary" />
                          </div>
                          <h3 className="text-lg font-semibold mb-2">
                            Create New Habit
                          </h3>
                          <p className="text-muted-foreground text-center max-w-sm">
                            {isAdmin
                              ? "As an admin, you can create unlimited habits"
                              : `You can create ${getTierLimit(user?.packageType || TIERS.FREE, isAdmin) -
                              habits.length
                              } more habits`}
                          </p>
                        </CardContent>
                      </Card>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                      <DialogHeader>
                        <DialogTitle>Create a New Habit</DialogTitle>
                        <DialogDescription>
                          Add another habit to your journey
                        </DialogDescription>
                      </DialogHeader>
                      <HabitForm onSuccess={() => setIsHabitDialogOpen(false)} />
                    </DialogContent>
                  </Dialog>
                )}

              {habits.map((habit, index) => (
                <motion.div
                  key={habit.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  onClick={() => setSelectedHabit(habit)}
                  className={cn(
                    "cursor-pointer transition-all duration-300",
                    selectedHabit?.id === habit.id && "scale-[1.02]",
                  )}
                >
                  <Card
                    className={cn(
                      "bg-card border hover:shadow-lg transition-all duration-300",
                      selectedHabit?.id === habit.id && "border-primary",
                    )}
                  >
                    <CardHeader className="pb-3">
                      <CardTitle className="flex justify-between items-center">
                        <span>{habit.name}</span>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingHabit(habit);
                            }}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <Edit className="h-5 w-5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setHabitToDelete(habit);
                            }}
                            className="text-red-500 hover:text-red-600 hover:bg-red-100/10"
                          >
                            <Trash2 className="h-5 w-5" />
                          </Button>
                          {habit.isRunning ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStopHabit(habit.id);
                              }}
                              className="text-yellow-600 border-yellow-600 hover:bg-yellow-600/10 text-lg py-2 px-4"
                            >
                              <Pause className="h-5 w-5 mr-2" />
                              Running
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartHabit(habit.id);
                              }}
                              className="text-green-600 border-green-600 hover:bg-green-600/10 text-lg py-2 px-4"
                            >
                              <Play className="h-5 w-5 mr-2" />
                              Start Now
                            </Button>
                          )}
                        </div>
                      </CardTitle>
                      {habit.description && (
                        <CardDescription className="mt-2">
                          {habit.description}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center text-sm">
                          <Calendar className="h-5 w-5 mr-2 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            Frequency:
                          </span>
                          <span className="ml-auto font-medium capitalize">
                            {habit.frequency}
                            {habit.selectedDays &&
                              Array.isArray(habit.selectedDays) &&
                              habit.selectedDays.length > 0 && (
                                <span className="text-xs text-muted-foreground ml-2">
                                  (
                                  {habit.selectedDays
                                    .map((dayNumber) => numbersToDays[dayNumber])
                                    .join(", ")}
                                  )
                                </span>
                              )}
                          </span>

                        </div>
                        <div className="flex items-center text-sm">
                          <Clock className="h-5 w-5 mr-2 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            Reminder:
                          </span>
                          <span className="ml-auto font-medium">
                            {format(
                              new Date(`2000-01-01T${habit.reminderTime}`),
                              "h:mm a",
                            )}
                          </span>
                        </div>
                        {habit.startedAt && (
                          <div className="text-xs text-muted-foreground">
                            Started:{" "}
                            {format(new Date(habit.startedAt), "MMM d, yyyy")}
                          </div>
                        )}
                        {habit.lastCheckin && (
                          <div className="text-xs text-muted-foreground">
                            Last check-in:{" "}
                            {format(
                              new Date(habit.lastCheckin),
                              "MMM d, yyyy h:mm a",
                            )}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                  {selectedHabit?.id === habit.id && habit && (
                    <HabitCalendar habit={habit} />
                  )}
                </motion.div>
              ))}
            </div>
          )}

          <div className="mb-12">
            <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
              Achievement Badges
            </h2>
            <Card className="bg-card w-full">
              <CardHeader>
                <CardTitle className="text-lg">Milestones</CardTitle>
                <CardDescription>
                  Major accomplishments in your journey
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {achievements.map((achievement, index) => (
                    <div
                      key={achievement.id}
                      className={`flex items-start space-x-4 p-4 rounded-lg transition-colors ${(habits.length && index == 0) ? "bg-primary/10" : "bg-muted/50"
                        }`}
                    >
                      <div
                        className={`shrink-0 ${habits.length ? "text-primary" : "text-muted-foreground"
                          }`}
                      >
                        {habits.length ? (
                          achievement.icon
                        ) : (
                          <Lock className="h-10 w-10" />
                        )}
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="font-medium">{achievement.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {achievement.description}
                        </p>
                        {!achievement.unlocked && achievement.progress < 100 && (
                          <div className="w-full bg-muted rounded-full h-1.5 mt-2">
                            <div
                              className="bg-primary h-1.5 rounded-full transition-all"
                              style={{ width: `${achievement.progress}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-12">
            <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
              Analytics & Insights
            </h2>

            <div className="mt-6">
              {selectedHabit ? (
                <Card className="bg-card w-full">
                  <CardHeader>
                    <CardTitle>AI-Powered Habit Insights</CardTitle>
                    <CardDescription>
                      Analysis and suggestions for "{selectedHabit.name}"
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6 pt-4">
                    {isLoadingInsights ? (
                      <div className="flex items-center justify-center h-[200px]">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : insights ? (
                      <>
                        <div>
                          <h4 className="font-semibold mb-2 text-primary">
                            Summary
                          </h4>
                          <p className="text-muted-foreground">
                            {insights.summary}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <h4 className="font-semibold mb-2 text-green-600">
                              Strengths
                            </h4>
                            <ul className="space-y-2">
                              {(insights.strengths || []).map(
                                (strength, index) => (
                                  <li
                                    key={index}
                                    className="text-sm text-muted-foreground flex items-start gap-2"
                                  >
                                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                                    {strength}
                                  </li>
                                ),
                              )}
                            </ul>
                          </div>

                          <div>
                            <h4 className="font-semibold mb-2 text-orange-600">
                              Areas for Improvement
                            </h4>
                            <ul className="space-y-2">
                              {(insights.improvements || []).map(
                                (improvement, index) => (
                                  <li
                                    key={index}
                                    className="text-sm text-muted-foreground flex items-start gap-2"
                                  >
                                    <Target className="h-5 w-5 text-orange-600 mt-0.5" />
                                    {improvement}
                                  </li>
                                ),
                              )}
                            </ul>
                          </div>
                        </div>

                        <div>
                          <h4 className="font-semibold mb-2 text-primary">
                            Suggestions
                          </h4>
                          <ul className="space-y-2">
                            {(insights.suggestions || []).map(
                              (suggestion, index) => (
                                <li
                                  key={index}
                                  className="text-sm text-muted-foreground flex items-start gap-2"
                                >
                                  <Star className="h-5 w-5 text-primary mt-0.5" />
                                  {suggestion}
                                </li>
                              ),
                            )}
                          </ul>
                        </div>

                        <div className="pt-4 border-t">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">
                              Consistency Score
                            </span>
                            <span className="text-lg font-bold text-primary">
                              {insights.consistency_score}%
                            </span>
                          </div>
                          <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary transition-all duration-500"
                              style={{
                                width: `${insights.consistency_score}%`,
                              }}
                            />
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center justify-center h-[200px] text-center">
                        <p className="text-muted-foreground">
                          Select a habit to view AI-powered insights
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card className="bg-card w-full">
                  <CardHeader>
                    <CardTitle>Habit Insights</CardTitle>
                    <CardDescription>
                      Select a habit to view AI-powered insights
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-[200px] flex items-center justify-center border-t">
                    <p className="text-muted-foreground">No habit selected</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          <Dialog
            open={selectedHabitId !== null}
            onOpenChange={(open) => !open && setSelectedHabitId(null)}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Verify Phone Number</DialogTitle>
                <DialogDescription>
                  Enter your phone number to receive SMS notifications for your habits.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label htmlFor="phone" className="text-sm font-medium">
                    Phone Number
                  </label>
                  <PhoneInput
                    id="phone"
                    international
                    defaultCountry="US" // You can set the default country code
                    value={phoneNumber}
                    onChange={setPhoneNumber}
                    placeholder="Enter phone number"
                    className="w-full py-2 px-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="tos"
                    checked={isTosAccepted}
                    onChange={(e) => setIsTosAccepted(e.target.checked)}
                  />
                  <label htmlFor="tos" className="text-sm">
                    I accept the <TermsDialog />
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="smsOptin"
                    checked={isSMSOptinAccepted}
                    onChange={(e) => setIsSMSOptin(e.target.checked)}
                  />
                  <label htmlFor="smsOptin" className="text-sm">
                    I consent to receive automated text messages (SMS) from Habitizr at the phone number provided for habit tracking reminders, progress follow-ups, and service-related notifications. Message and data rates may apply. I understand that consent is not required to use the service and that I may opt out at any time by replying STOP.
                    <br />  <SMSOptin />
                  </label>
                </div>

                <Button
                  onClick={handlePhoneSubmit}
                  className="w-full text-lg py-3 px-6"
                  disabled={isVerifying || !isTosAccepted || !isSMSOptinAccepted} // Disable if not accepted TOS
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    'Verify & Start Habit'
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog
            open={editingHabit !== null}
            onOpenChange={(open) => !open && setEditingHabit(null)}
          >
            <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Habit</DialogTitle>
                <DialogDescription>Update your habit details</DialogDescription>
              </DialogHeader>
              <HabitForm
                initialData={editingHabit}
                onSuccess={() => setEditingHabit(null)}
              />
            </DialogContent>
          </Dialog>


          <AlertDialog
            open={!!habitToDelete}
            onOpenChange={() => setHabitToDelete(null)}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the
                  habit "{habitToDelete?.name}" and all associated data
                  including your progress, check-ins, and insights.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={async (e) => {
                    e.preventDefault();
                    try {
                      if (habitToDelete) {
                        await deleteHabit(habitToDelete.id);
                        if (selectedHabit?.id === habitToDelete.id) {
                          setSelectedHabit(null);
                        }
                        setHabitToDelete(null);
                        toast({
                          title: "Success",
                          description: "Habit deleted successfully",
                        });
                      }
                    } catch (error) {
                      toast({
                        variant: "destructive",
                        title: "Error",
                        description: "Failed to delete habit",
                      });
                    }
                  }}
                  className="bg-red-500 hover:bg-red-600 text-lg py-3 px-6"
                >
                  Delete Habit
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <div className="mt-12 flex justify-center mb-8">
            <ProblemReportForm />
          </div>
        </div>
      </div>
    </div>
  );
}