import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react"; // Assuming you use this for a loader animation
import axios from "axios";  // Import axios for HTTP requests

export function ForgotPasswordModal({ show, onClose }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
  
    try {
      // Call your API to handle password reset request
      await sendPasswordResetLink(email);
  
      // Only set success after the API call succeeds
      setSuccess(true);
    } catch (error) {
      console.error("Error resetting password:", error);
      // Optionally, set an error message or handle the error state
      // setError(true);  // Assuming you have an `setError` state to show the error message
    } finally {
      // Always stop loading, whether success or error
      setLoading(false);
    }
  };
  
  const sendPasswordResetLink = async (email: string) => {
    try {
      const res = await axios.post("/api/forgot-password", {
        email: email,
      });
  
      if (res.status === 200) {
        // Return success indication so it can be handled by the caller (handleSubmit)
        return true;
      } else {
        // Handle non-success status codes
        throw new Error(`Error: ${res.status}`);
      }
    } catch (error) {
      // Handle any error that occurred in the request or API
      throw new Error("An error occurred while sending the password reset link.");
    }
  };
  
  

  return (
    <Dialog open={show} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Forgot Password</DialogTitle>
          <DialogDescription>Enter your email to receive a password reset link.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!success ? (
            <>
              <div className="space-y-4">
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="transition-all duration-200 focus:scale-[1.02] py-6"
                />
              </div>
              <Button
                type="submit"
                className="w-full btn-gradient py-6 mt-8"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Send Reset Link"
                )}
              </Button>
            </>
          ) : (
            <div className="text-center">
              <p className="text-sm text-green-500">
                A password reset link has been sent to your email.
              </p>
              <Button
                type="button"
                className="w-full btn-gradient py-6 mt-8"
                onClick={onClose}
              >
                Close
              </Button>
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
