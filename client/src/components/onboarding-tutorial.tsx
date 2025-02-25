import React from "react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, ChevronRight, Plus, Calendar, Trophy, Target } from "lucide-react";
import { cn } from "@/lib/utils";

const steps = [
  {
    title: "Welcome to Habitizr!",
    description: "Let's create your first habit together. We'll guide you through the process step by step.",
    icon: Trophy,
  },
  {
    title: "Choose Your First Habit",
    description: "Start with something simple. What habit would you like to build? For example: 'Morning Run' or 'Read for 30 minutes'.",
    icon: Target,
  },
  {
    title: "Set Your Schedule",
    description: "Decide when and how often you want to practice your habit. Regular scheduling helps build consistency.",
    icon: Calendar,
  },
  {
    title: "Track Your Progress",
    description: "Use our tracking tools to monitor your habit streak and get AI-powered insights on your journey.",
    icon: CheckCircle,
  },
];

interface OnboardingTutorialProps {
  onComplete: () => void;
  onCreateHabit: () => void;
}

export function OnboardingTutorial({ onComplete, onCreateHabit }: OnboardingTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isExiting, setIsExiting] = useState(false);

  const handleNext = () => {
    if (currentStep === steps.length - 1) {
      setIsExiting(true);
      setTimeout(() => {
        onComplete();
      }, 500);
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleCreateHabit = () => {
    setIsExiting(true);
    setTimeout(() => {
      onCreateHabit();
    }, 500);
  };

  const CurrentStepIcon = steps[currentStep].icon;

  return (
    <AnimatePresence>
      {!isExiting && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <Card className="w-full max-w-lg">
            <CardHeader>
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex items-center gap-4"
              >
                {steps.map((_, index) => (
                  <div
                    key={index}
                    className={cn(
                      "w-2 h-2 rounded-full transition-colors",
                      index === currentStep
                        ? "bg-primary"
                        : index < currentStep
                        ? "bg-primary/50"
                        : "bg-muted"
                    )}
                  />
                ))}
              </motion.div>
              <motion.div
                key={`title-${currentStep}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <CardTitle className="text-2xl flex items-center gap-2">
                  <CurrentStepIcon className="h-6 w-6" />
                  {steps[currentStep].title}
                </CardTitle>
                <CardDescription className="text-base mt-2">
                  {steps[currentStep].description}
                </CardDescription>
              </motion.div>
            </CardHeader>
            <CardContent>
              <motion.div
                key={`content-${currentStep}`}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="min-h-[200px] flex items-center justify-center"
              >
                {currentStep === 1 && (
                  <Button
                    size="lg"
                    onClick={handleCreateHabit}
                    className="gap-2"
                  >
                    <Plus className="h-5 w-5" />
                    Create Your First Habit
                  </Button>
                )}
              </motion.div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button
                variant="ghost"
                onClick={onComplete}
              >
                Skip Tutorial
              </Button>
              <Button
                onClick={handleNext}
                className="gap-2"
              >
                {currentStep === steps.length - 1 ? "Get Started" : "Next"}
                <ChevronRight className="h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}