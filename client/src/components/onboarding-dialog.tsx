import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-user";

export function OnboardingDialog() {
  const { user, updateUser } = useUser();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [aiHelperName, setAiHelperName] = useState(user?.aiHelperName || "");

  // Only show dialog if onboarding is not completed
  if (user?.onboardingCompleted) {
    return null;
  }

  const handleNameSubmit = async () => {
    if (!aiHelperName.trim()) {
      toast({
        title: "Name required",
        description: "Please give your AI helper a name to continue.",
        variant: "destructive",
      });
      return;
    }

    try {
      await updateUser({
        aiHelperName: aiHelperName.trim(),
        onboardingCompleted: true,
      });

      toast({
        title: "Welcome aboard!",
        description: `${aiHelperName} is ready to help you build better habits.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save AI helper name. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={!user?.onboardingCompleted} modal>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Welcome to Habitizr!</DialogTitle>
          <DialogDescription>
            Let's get you set up with your personal AI habit coach.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="aiHelperName">
              What would you like to name your AI habit coach?
            </Label>
            <Input
              id="aiHelperName"
              placeholder="e.g., Alex, Sam, Coach"
              value={aiHelperName}
              onChange={(e) => setAiHelperName(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              This name will be used in your SMS reminders and conversations.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button type="submit" onClick={handleNameSubmit}>
            Get Started
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
