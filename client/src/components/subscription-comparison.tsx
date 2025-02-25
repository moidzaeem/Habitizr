import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import { TIERS, PRICING_TIERS } from "@/lib/tiers";
import { toast } from "@/hooks/use-toast";

interface SubscriptionComparisonProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SubscriptionComparison({ open, onOpenChange }: SubscriptionComparisonProps) {
  const handleUpgrade = async () => {
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          packageType: TIERS.TRAILBLAZER,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { url } = await response.json();
      if (url) {
        window.location.href = url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      toast({
        title: "Error",
        description: "Failed to start upgrade process. Please try again.",
        variant: "destructive",
      });
    }
  };

  const features = [
    {
      name: "Number of Habits",
      pathfinder: "1 habit",
      trailblazer: "Up to 3 habits",
      description: "Maximum number of habits you can track"
    },
    {
      name: "Habit Tracking",
      pathfinder: true,
      trailblazer: true,
      description: "Track your daily habits and routines"
    },
    {
      name: "Basic Analytics",
      pathfinder: true,
      trailblazer: true,
      description: "View simple progress charts"
    },
    {
      name: "AI-Powered Insights",
      pathfinder: "Basic insights",
      trailblazer: "Advanced personalized insights",
      description: "Get AI-generated recommendations"
    },
    {
      name: "SMS Reminders",
      pathfinder: true,
      trailblazer: true,
      description: "Receive SMS notifications for habit reminders"
    },
    {
      name: "Priority Support",
      pathfinder: false,
      trailblazer: true,
      description: "Get faster responses from our support team"
    },
    {
      name: "Advanced Analytics",
      pathfinder: false,
      trailblazer: "Coming soon",
      description: "Access detailed progress metrics and trends (coming soon)"
    }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle className="text-2xl">Choose Your Plan</DialogTitle>
          <DialogDescription>
            Select the plan that best fits your habit-building journey
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          {/* Pathfinder Plan */}
          <div className="rounded-lg border p-6 bg-card">
            <h3 className="text-xl font-semibold">Pathfinder</h3>
            <p className="text-3xl font-bold mt-2">
              ${PRICING_TIERS[TIERS.PATHFINDER].price}
              <span className="text-sm font-normal text-muted-foreground">/month</span>
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Perfect for getting started with habit tracking
            </p>
            <div className="mt-6 space-y-4">
              {features.map((feature) => (
                <div key={feature.name} className="flex items-start gap-2">
                  {typeof feature.pathfinder === 'boolean' ? (
                    feature.pathfinder ? (
                      <Check className="h-5 w-5 text-green-500 mt-0.5" />
                    ) : (
                      <X className="h-5 w-5 text-red-500 mt-0.5" />
                    )
                  ) : (
                    <Check className="h-5 w-5 text-green-500 mt-0.5" />
                  )}
                  <div>
                    <p className="font-medium">{feature.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {typeof feature.pathfinder === 'string'
                        ? feature.pathfinder
                        : feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Trailblazer Plan */}
          <div className="rounded-lg border-2 border-primary p-6 bg-card relative">
            <div className="absolute -top-3 right-4 bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm">
              Recommended
            </div>
            <h3 className="text-xl font-semibold">Trailblazer</h3>
            <p className="text-3xl font-bold mt-2">
              ${PRICING_TIERS[TIERS.TRAILBLAZER].price}
              <span className="text-sm font-normal text-muted-foreground">/month</span>
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              For serious habit builders who want all features
            </p>
            <div className="mt-6 space-y-4">
              {features.map((feature) => (
                <div key={feature.name} className="flex items-start gap-2">
                  {typeof feature.trailblazer === 'boolean' ? (
                    feature.trailblazer ? (
                      <Check className="h-5 w-5 text-green-500 mt-0.5" />
                    ) : (
                      <X className="h-5 w-5 text-red-500 mt-0.5" />
                    )
                  ) : (
                    <Check className="h-5 w-5 text-green-500 mt-0.5" />
                  )}
                  <div>
                    <p className="font-medium">{feature.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {typeof feature.trailblazer === 'string'
                        ? feature.trailblazer
                        : feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <Button className="w-full mt-6" onClick={handleUpgrade}>
              Upgrade to Trailblazer
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}