/**
 * NavBar Component
 *
 * A responsive navigation bar that provides user authentication status,
 * subscription management, and navigation controls.
 *
 * Features:
 * - Dynamic background on scroll
 * - User authentication status
 * - Subscription upgrade button (for Pathfinder users)
 * - Admin panel access (for admin users)
 * - Profile and logout functionality
 */

// External library imports
import { Link } from "wouter";
import { useEffect, useState } from "react";

// UI Component imports
import { Button } from "@/components/ui/button";
import { UserCircle, LogOut, Settings, Crown } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import Logo from "@/components/ui/logo"; // Import the Logo component

// Custom hooks and utilities
import { useUser } from "@/hooks/use-user";
import { useToast } from "@/hooks/use-toast";
import { TIERS } from "@/lib/tiers";

// Feature components
import { SubscriptionComparison } from "./subscription-comparison";

interface NavBarProps {
  showAuthButtons?: boolean;
}

export default function NavBar({ showAuthButtons = true }: NavBarProps) {
  // Hook initializations
  const { user, logout } = useUser();
  const { toast } = useToast();

  // Local state
  const [scrolled, setScrolled] = useState(false);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  // Scroll effect handler
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  /**
   * Handles user logout with error handling
   * Displays toast messages for success/failure states
   */
  const handleLogout = async () => {
    try {
      const result = await logout();
      if (!result.ok) {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.message,
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to logout",
      });
    }
  };

  return (
    <>
      {/* Main Navigation Bar */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
          scrolled
            ? "bg-background/80 backdrop-blur-sm shadow-sm"
            : "bg-transparent"
        }`}
      >
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          {/* Logo/Home Link */}
          <Link href="/">
            <Logo /> {/* Replaced Habitizr text with Logo component */}
          </Link>

          {/* Navigation Controls */}
          <div className="flex items-center gap-4">
            {/* Subscription Upgrade Button (Pathfinder users only) */}
            {user?.packageType === TIERS.PATHFINDER && (
              <Button
                variant="default"
                className="bg-gradient-to-r from-primary to-blue-600 text-white hover:opacity-90 gap-2"
                onClick={() => setShowSubscriptionModal(true)}
              >
                <Crown className="h-4 w-4" />
                Upgrade to Trailblazer
              </Button>
            )}

            {/* Admin Panel Access */}
            {user?.role === "admin" && (
              <Link href="/admin">
                <Button variant="ghost" size="icon" title="Admin Panel">
                  <Settings className="h-5 w-5" />
                </Button>
              </Link>
            )}

            {showAuthButtons && (
              <>
                {/* Profile Link */}
                <Link href="/profile">
                  <Button variant="ghost" size="icon">
                    <UserCircle className="h-5 w-5" />
                  </Button>
                </Link>

                {/* Logout Button */}
                <Button variant="ghost" size="icon" onClick={handleLogout}>
                  <LogOut className="h-5 w-5" />
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Subscription Modal */}
      <SubscriptionComparison
        open={showSubscriptionModal}
        onOpenChange={setShowSubscriptionModal}
      />
    </>
  );
}
