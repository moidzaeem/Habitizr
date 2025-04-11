import { useState, useEffect } from "react";
import { useUser } from "@/hooks/use-user";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, CreditCard, CheckCircle2, Calendar, Loader2 } from "lucide-react";
import NavBar from "@/components/nav-bar";
import { TIERS, PRICING_TIERS, isWithinTrialPeriod } from "@/lib/tiers";
import { STRIPE_PRODUCTS } from "@/lib/stripe";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useQueryClient } from "@tanstack/react-query";
import { SubscriptionComparison } from "@/components/subscription-comparison";
import { loadStripe } from "@stripe/stripe-js";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

const profileSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
  confirmPassword: z.string(),
  phoneNumber: z.string().min(10, "Valid phone number is required"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ProfileFormData = z.infer<typeof profileSchema>;

async function upgradePackage(packageType: string) {
  const response = await fetch('/api/upgrade-package', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ packageType }),
    credentials: 'include', // Important for session cookies
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to upgrade package');
  }

  return response.json();
}

export default function Profile() {
  const { user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false); // Added state for modal

  // Calculate subscription-related information
  const isPathfinderUser = user?.packageType === TIERS.PATHFINDER;
  const isInTrialPeriod = user?.stripeSubscriptionStatus == 'trial' && user?.createdAt ? isWithinTrialPeriod(new Date(user.createdAt)) : false;
  const currentPlan = PRICING_TIERS[user?.packageType || TIERS.PATHFINDER];
  const isTrialExpired = !isInTrialPeriod;

  useEffect(() => {
    if (user?.packageType !== TIERS.FREE &&  isTrialExpired) {
      setShowUpgradeModal(true); // Show modal if trial expired
    }
  }, [isTrialExpired]);

  const handleCancelSubscription = async () => {
    try {
      const response = await fetch('/api/stripe/cancel-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to cancel subscription');
      }

      toast({
        title: "Success",
        description: "Your subscription has been canceled.",
      });

      // Refresh user data to update UI
      await queryClient.invalidateQueries({ queryKey: ['/api/user'] });
    } catch (error) {
      console.error('Error canceling subscription:', error);
      toast({
        title: "Error",
        description: "Failed to cancel subscription. Please try again.",
        variant: "destructive",
      });
    }
  };

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
      phoneNumber: user?.phoneNumber || "",
    },
  });

  const onSubmit = async (data: ProfileFormData) => {
    try {
      const response = await fetch('/api/user/update-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
          phoneNumber: data.phoneNumber,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      toast({
        title: "Success",
        description: "Profile updated successfully",
      });

      // Reset password fields but keep phone number
      form.reset({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
        phoneNumber: data.phoneNumber,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update profile",
        variant: "destructive",
      });
    }
  };

  const handleDeleteAccount = async () => {
    try {



      const response = await fetch("/api/delete-user", {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        toast({
          title: "Error Deleting Account",
          description: errorData.error || "Something went wrong. Please try again.",
        });
        return;
      }

      // Handle successful deletion
      toast({
        title: "Account Deleted",
        description: "Your account has been permanently deleted.",
      });

      // Redirect to login or home page after account deletion (if necessary)
      // Example:
      window.location.href = "/auth";

    } catch (error) {
      console.error("Error deleting account:", error);
      toast({
        title: "Error Deleting Account",
        description: "An error occurred while deleting your account. Please try again.",
      });
    }
  };

  const handleBackToDashboard = () => {
    window.location.href = "/";
  };

  const handleUpgrade = async () => {
    if (isUpgrading) return;

    setIsUpgrading(true);
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          packageType: TIERS.TRAILBLAZER
        }),
        credentials: 'include'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create checkout session');
      }

      const { sessionId } = await response.json();
      const stripe = await stripePromise;

      if (!stripe) {
        throw new Error('Stripe failed to initialize');
      }

      // Redirect to Stripe's checkout page
      const { error } = await stripe.redirectToCheckout({ sessionId });

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error upgrading package:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upgrade subscription. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpgrading(false);
    }
  };


  return (
    <>
      <SubscriptionComparison
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
      />
      <div className="min-h-screen bg-background">
        <NavBar />

        <div className="container mx-auto px-6 py-8 pt-24 max-w-[1400px]">
          {/* Header with Back Button */}
          <div className="mb-8">
            <Button
              variant="ghost"
              className="mb-4 hover:bg-muted/50 text-lg py-6 px-6"
              onClick={handleBackToDashboard}
            >
              <ArrowLeft className="mr-2 h-6 w-6" />
              Back to Dashboard
            </Button>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
              Profile Settings
            </h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Subscription Information Card */}
            {user?.role !== 'admin' && <Card className="border shadow-lg lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-6 w-6" />
                  Subscription Details
                </CardTitle>
                <CardDescription>
                  Your current plan and subscription status{' '}
                  {user?.packageType !== TIERS.FREE &&
                    isTrialExpired &&
                    user?.stripeSubscriptionStatus !== 'active' ? (
                    <span
                      onClick={() => setShowUpgradeModal(true)}
                      className="text-red-500 cursor-pointer"
                    >
                      (TRIAL EXPIRED) Click here to upgrade
                    </span>
                  ) : user?.packageType === TIERS.FREE ? (
                    ' is FREE'
                  ) : (
                    ' is in Trial'
                  )}
                </CardDescription>


              </CardHeader>
              {user?.stripeSubscriptionStatus === 'active' && (
                <CardContent className="space-y-6">
                  <div className="p-4 rounded-lg bg-muted/50">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold capitalize">
                          {currentPlan.name} Plan
                        </h3>

                        <p className="text-sm text-muted-foreground">
                          ${currentPlan.price}/month
                        </p>
                      </div>
                      {isInTrialPeriod && (
                        <div className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
                          Trial Period
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-start gap-2">
                        <Calendar className="h-5 w-5 mt-1 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Member Since</p>
                          <p className="text-sm text-muted-foreground">
                            {user?.createdAt ? format(new Date(user.createdAt), 'MMMM d, yyyy') : 'N/A'}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-sm font-medium">Plan Features:</p>
                        <ul className="space-y-2">
                          {currentPlan.features.map((feature, index) => (
                            <li key={index} className="flex items-center gap-2 text-sm">
                              <CheckCircle2 className="h-5 w-5 text-primary" />
                              {feature}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="mt-6 space-y-2">
                      {user?.stripeSubscriptionStatus === 'active' && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              className="w-full text-lg py-3 px-6"
                              variant="destructive"
                            >
                              Cancel Subscription
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Cancel Your Subscription?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to cancel your subscription? You'll continue to have access until the end of your current billing period.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={handleCancelSubscription}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-lg py-3 px-6"
                              >
                                Yes, Cancel Subscription
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                </CardContent>
              )}

            </Card>}

            {/* Account Settings Card */}
            <Card className="border shadow-lg lg:col-span-2">
              <CardHeader>
                <CardTitle>Account Settings</CardTitle>
                <CardDescription>
                  Manage your account settings and preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Account Information */}
                <div className="p-4 rounded-lg bg-muted/50">
                  <h3 className="text-lg font-medium mb-2">Account Information</h3>
                  <div className="space-y-2">
                    <p className="text-sm">
                      <span className="text-muted-foreground">Username:</span>{" "}
                      <span className="font-medium">{user?.username}</span>
                    </p>
                    <p className="text-sm">
                      <span className="text-muted-foreground">Phone Status:</span>{" "}
                      <span className={`font-medium ${user?.phoneVerified ? "text-green-600" : "text-yellow-600"}`}>
                        {user?.phoneVerified ? "Verified" : "Not Verified"}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Update Form */}
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="space-y-4 p-4 rounded-lg bg-muted/50">
                      <h3 className="text-lg font-medium mb-4">Change Password</h3>

                      <FormField
                        control={form.control}
                        name="currentPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Current Password</FormLabel>
                            <FormControl>
                              <Input
                                type="password"
                                placeholder="Enter your current password"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="newPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>New Password</FormLabel>
                            <FormControl>
                              <Input
                                type="password"
                                placeholder="Enter new password"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                            <p className="text-sm text-muted-foreground">
                              Password must contain at least 8 characters, including uppercase, lowercase, numbers, and special characters.
                            </p>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Confirm New Password</FormLabel>
                            <FormControl>
                              <Input
                                type="password"
                                placeholder="Confirm new password"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="space-y-4 p-4 rounded-lg bg-muted/50">
                      <h3 className="text-lg font-medium mb-4">Contact Information</h3>

                      <FormField
                        control={form.control}
                        name="phoneNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone Number</FormLabel>
                            <FormControl>
                              <Input
                                type="tel"
                                placeholder="+1234567890"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Button type="submit" className="w-full text-lg py-3 px-6">
                      Update Profile
                    </Button>
                  </form>
                </Form>

                {/* Danger Zone */}
                <div className="pt-6 border-t">
                  <h3 className="text-lg font-medium text-destructive mb-4">
                    Danger Zone
                  </h3>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" className="w-full text-lg py-3 px-6">
                        Delete Account
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete your
                          account and remove all of your data from our servers.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDeleteAccount}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-lg py-3 px-6"
                        >
                          Delete Account
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}