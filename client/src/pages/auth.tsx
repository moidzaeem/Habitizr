
import React from "react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import Logo from "@/components/ui/logo";
import { Apple, Play } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AuthPage } from "./auth-page";

export default function Auth() {
  const { toast } = useToast();
  
  return (
    <div className="min-h-screen gradient-bg">
      <nav className="fixed top-0 left-0 right-0 z-50 transition-all duration-200 bg-background/80 backdrop-blur-sm shadow-sm">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <Link href="/">
            <Logo />
          </Link>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              className="gap-2 font-medium text-lg px-6 py-6"
              onClick={() => {
                toast({
                  title: "Coming Soon!",
                  description: "The iOS app is currently in development.",
                })
              }}
            >
              <Apple className="h-8 w-8" />
              App Store
            </Button>
            <Button
              variant="outline"
              className="gap-2 font-medium text-lg px-6 py-6"
              onClick={() => {
                toast({
                  title: "Coming Soon!",
                  description: "The Android app is currently in development.",
                })
              }}
            >
              <Play className="h-8 w-8" />
              Play Store
            </Button>
          </div>
        </div>
      </nav>
      <div className="h-16"></div>
      <AuthPage />
    </div>
  );
}
