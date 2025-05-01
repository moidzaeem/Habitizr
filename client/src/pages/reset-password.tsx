import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import Logo from "@/components/ui/logo";
import { Apple, Play } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter"; // Assuming you're using wouter for routing
import axios from "axios";  // Import axios for HTTP requests

export default function ResetPasswordPage() {
  const { toast } = useToast();
  const [token, setToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const location = useLocation();

  useEffect(() => {
    // Extract token from URL
    const { search } = window.location;  // Use window.location.search to get query string
    const urlParams = new URLSearchParams(search);  // Extract query parameters
    const token = urlParams.get("token");
  
    if (token) {
      setToken(token); // Save token in state
    } else {
      setError("Invalid or expired token");
    }
  }, [location]);

  const handleResetPassword = async () => {
    if (!token || !newPassword) {
      setError("Please provide a valid token and password.");
      return;
    }

    setLoading(true);
    setError(null); // Reset any previous errors

    try {
      const response = await axios.post("/api/reset-password", {
        token,
        newPassword,
      });

      if (response.status === 200) {
        setSuccess(true);
      } else {
        setError("Failed to reset password. Please try again.");
      }
    } catch (error) {
      console.log(error);
      setError(error?.response?.data.message || "An error occurred while resetting password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-bg">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm shadow-sm">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/">
            <Logo />
          </Link>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              className="gap-2 font-medium text-lg px-6 py-4"
              onClick={() => {
                toast({
                  title: "Coming Soon!",
                  description: "The iOS app is currently in development.",
                });
              }}
            >
              <Apple className="h-8 w-8" />
              App Store
            </Button>
            <Button
              variant="outline"
              className="gap-2 font-medium text-lg px-6 py-4"
              onClick={() => {
                toast({
                  title: "Coming Soon!",
                  description: "The Android app is currently in development.",
                });
              }}
            >
              <Play className="h-8 w-8" />
              Play Store
            </Button>
          </div>
        </div>
      </nav>
      <div className="h-16"></div>

      {/* Main Reset Password Section */}
      <div className="flex flex-col items-center justify-center px-6 py-8">
        <div className="max-w-md w-full space-y-6 bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-semibold text-center text-gray-800 mb-6">
            Reset Your Password
          </h2>
          
          {error && (
            <div className="text-sm text-red-600 bg-red-100 p-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          {success ? (
            <div className="text-lg text-green-600">
              <p>Password reset successfully! You can now log in with your new password.</p>
              <Link href="/auth">
                <Button variant="link" className="mt-4">Go to Login</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              <input
                type="password"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <Button
                onClick={handleResetPassword}
                disabled={loading || !newPassword}
                className={`w-full py-3 ${loading ? "bg-gray-400" : "bg-primary"}`}
              >
                {loading ? "Resetting..." : "Reset Password"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
