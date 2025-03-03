import React from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-user";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useLocation } from "wouter";
import { SiFacebook, SiGoogle } from "react-icons/si";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";
import NavBar from "@/components/nav-bar";
import {
  TermsDialog,
  PrivacyDialog,
  CookieDialog,
} from "@/components/policy-dialogs";

const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const registerSchema = loginSchema.extend({
  email: z.string().email("Invalid email address"),
  tosAccepted: z.literal(true, {
    errorMap: () => ({ message: "You must accept the Terms of Service" }),
  }),
});

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

export default function AuthPage() {
  const [location, setLocation] = useLocation();
  const { login, register } = useUser();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);

  const loginForm = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const registerForm = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      password: "",
      email: "",
      tosAccepted: false,
    },
    mode: "onChange",
  });

  const handleLogin = async (values: z.infer<typeof loginSchema>) => {
    try {
      const result = await login(values);
      if (result.ok) {
        setLocation("/");
      } else {
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
        description: "An unexpected error occurred",
      });
    }
  };

  const handleRegister = async (values: z.infer<typeof registerSchema>) => {
    try {
      const result = await register(values);
      if (result.ok) {
        toast({
          title: "Registration successful",
          description: "Please login",
        });
        //  registerForm.reset();
        setTimeout(()=>{
            window.location.href = '/auth'
        }, 1000)
        // window.location.href = '/'; // Redirect to the root URL
      } else {
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
        description: "An unexpected error occurred",
      });
    }
  };

  const verificationError = location.includes("error=invalid-token");
  const justVerified = location.includes("verified=true");

  return (
    <div className="min-h-screen gradient-bg">
      <NavBar showAuthButtons={false} />

      <div className="container mx-auto px-6 pt-24">
        <motion.div
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={fadeIn}
          transition={{ duration: 0.5 }}
          className="max-w-6xl mx-auto"
        >
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent mb-4">
              Start Your Journey to Better Habits Today!
            </h1>
            <p className="text-xl leading-relaxed text-gray-700 dark:text-gray-300 max-w-2xl mx-auto font-medium">
              Join thousands of others who have transformed their lives with
              AI-powered habit tracking and personalized guidance through SMS.
              Let our intelligent system help you build lasting positive
              changes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="hidden md:block"
            >
              <div className="w-full transition-all duration-300 hover:shadow-xl border border-primary/10 shadow-lg rounded-lg overflow-hidden">
                <img
                  src="/attached_assets/pexels-karolina-grabowska-5908728.jpg"
                  alt="People doing yoga in a bright, colorful setting"
                  className="w-full"
                  style={{ height: "calc(100vh - 400px)", objectFit: "cover" }}
                />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <Card className="w-full transition-all duration-300 hover:shadow-xl border border-primary/10 shadow-lg">
                <CardHeader className="pb-8">
                  <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <CardTitle className="text-2xl font-bold">
                      Welcome to Habitizr
                    </CardTitle>
                    <CardDescription className="text-lg mt-2 text-gray-600 dark:text-gray-400 font-medium">
                      Create an account or log in to get started
                    </CardDescription>
                  </motion.div>
                </CardHeader>
                <CardContent className="max-h-[600px] overflow-y-auto">
                  <AnimatePresence mode="wait">
                    {verificationError && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <Alert variant="destructive" className="mb-6">
                          <AlertDescription>
                            Invalid or expired verification link. Please try
                            registering again.
                          </AlertDescription>
                        </Alert>
                      </motion.div>
                    )}
                    {justVerified && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <Alert className="mb-6">
                          <AlertDescription>
                            Email verified successfully! You can now log in.
                          </AlertDescription>
                        </Alert>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="space-y-8">
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="grid grid-cols-2 gap-4"
                    >
                      <Button
                        variant="outline"
                        className="w-full py-6 transition-all duration-300 hover:scale-105"
                        onClick={() => (window.location.href = "/auth/google")}
                      >
                        <SiGoogle className="mr-2 h-5 w-5" />
                        Google
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full py-6 transition-all duration-300 hover:scale-105"
                        onClick={() =>
                          (window.location.href = "/auth/facebook")
                        }
                      >
                        <SiFacebook className="mr-2 h-5 w-5" />
                        Facebook
                      </Button>
                    </motion.div>

                    <div className="relative my-8">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-sm uppercase">
                        <span className="bg-background px-4 text-gray-600 dark:text-gray-400 font-medium">
                          Or continue with
                        </span>
                      </div>
                    </div>

                    <Tabs defaultValue="login" className="w-full">
                      <TabsList className="grid w-full grid-cols-2 mb-8">
                        <TabsTrigger value="login">Login</TabsTrigger>
                        <TabsTrigger value="register">Register</TabsTrigger>
                      </TabsList>

                      <TabsContent value="login">
                        <motion.form
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3 }}
                          onSubmit={loginForm.handleSubmit(handleLogin)}
                          className="space-y-6"
                        >
                          <div className="space-y-4">
                            <Input
                              placeholder="Username"
                              {...loginForm.register("username")}
                              className="transition-all duration-200 focus:scale-[1.02] py-6"
                            />
                            {loginForm.formState.errors.username && (
                              <p className="text-sm text-destructive">
                                {loginForm.formState.errors.username.message}
                              </p>
                            )}
                          </div>
                          <div className="space-y-4">
                            <Input
                              type="password"
                              placeholder="Password"
                              {...loginForm.register("password")}
                              className="transition-all duration-200 focus:scale-[1.02] py-6"
                            />
                            {loginForm.formState.errors.password && (
                              <p className="text-sm text-destructive">
                                {loginForm.formState.errors.password.message}
                              </p>
                            )}
                          </div>
                          <Button
                            type="submit"
                            className="w-full btn-gradient py-6 mt-8"
                            disabled={loginForm.formState.isSubmitting}
                          >
                            {loginForm.formState.isSubmitting ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              "Login"
                            )}
                          </Button>
                        </motion.form>
                      </TabsContent>

                      <TabsContent value="register">
                        <motion.form
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3 }}
                          onSubmit={registerForm.handleSubmit(handleRegister)}
                          className="space-y-6"
                        >
                          <div className="space-y-4">
                            <Input
                              placeholder="Username"
                              {...registerForm.register("username")}
                              className="transition-all duration-200 focus:scale-[1.02] py-6"
                            />
                            {registerForm.formState.errors.username && (
                              <p className="text-sm text-destructive">
                                {registerForm.formState.errors.username.message}
                              </p>
                            )}
                          </div>
                          <div className="space-y-4">
                            <Input
                              type="email"
                              placeholder="Email"
                              {...registerForm.register("email")}
                              className="transition-all duration-200 focus:scale-[1.02] py-6"
                            />
                            {registerForm.formState.errors.email && (
                              <p className="text-sm text-destructive">
                                {registerForm.formState.errors.email.message}
                              </p>
                            )}
                          </div>
                          <div className="space-y-4">
                            <Input
                              type="password"
                              placeholder="Password"
                              {...registerForm.register("password")}
                              className="transition-all duration-200 focus:scale-[1.02] py-6"
                            />
                            {registerForm.formState.errors.password && (
                              <p className="text-sm text-destructive">
                                {registerForm.formState.errors.password.message}
                              </p>
                            )}
                          </div>
                          <div className="items-top flex space-x-2 mt-6">
                            <Checkbox
                              id="terms"
                              checked={registerForm.watch("tosAccepted")}
                              onCheckedChange={(checked) => {
                                registerForm.setValue(
                                  "tosAccepted",
                                  checked === true,
                                  {
                                    shouldValidate: true,
                                  },
                                );
                              }}
                              className="transition-transform duration-200 hover:scale-110"
                            />
                            <div className="grid gap-1.5 leading-none">
                              <label
                                htmlFor="terms"
                                className="text-sm text-gray-600 dark:text-gray-400 font-medium cursor-pointer"
                              >
                                I agree to the{" "}
                                <TermsDialog
                                  trigger={
                                    <span className="underline hover:text-primary transition-colors duration-200 font-semibold cursor-pointer">
                                      terms of service
                                    </span>
                                  }
                                />
                              </label>
                            </div>
                          </div>
                          {registerForm.formState.errors.tosAccepted && (
                            <p className="text-sm text-destructive">
                              {
                                registerForm.formState.errors.tosAccepted
                                  .message
                              }
                            </p>
                          )}
                          <Button
                            type="submit"
                            className="w-full btn-gradient py-6 mt-8"
                            disabled={registerForm.formState.isSubmitting}
                          >
                            {registerForm.formState.isSubmitting ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              "Register"
                            )}
                          </Button>
                        </motion.form>
                      </TabsContent>
                    </Tabs>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-16 text-center"
          >
            <h2 className="text-2xl font-bold text-primary mb-4">
              Why Choose Habitizr?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <div className="section-card p-6 border border-primary/10 shadow-lg hover:shadow-xl transition-all duration-300">
                <h3 className="font-semibold text-lg mb-2">
                  Simple & Effective
                </h3>
                <p className="text-gray-700 dark:text-gray-300 font-medium">
                  Track your habits via SMS - no apps to install, no
                  notifications to ignore.
                </p>
              </div>
              <div className="section-card p-6 border border-primary/10 shadow-lg hover:shadow-xl transition-all duration-300">
                <h3 className="font-semibold text-lg mb-2">
                  AI-Powered Insights
                </h3>
                <p className="text-gray-700 dark:text-gray-300 font-medium">
                  Get personalized feedback and motivation based on your
                  responses.
                </p>
              </div>
              <div className="section-card p-6 border border-primary/10 shadow-lg hover:shadow-xl transition-all duration-300">
                <h3 className="font-semibold text-lg mb-2">Proven Results</h3>
                <p className="text-gray-700 dark:text-gray-300 font-medium">
                  Join thousands who have successfully built lasting habits with
                  our platform.
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>

      <footer className="mt-24 bg-background border-t">
        <div className="container mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
              &copy; {new Date().getFullYear()} Habitizr. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <TermsDialog
                trigger={
                  <span className="text-sm text-gray-600 hover:text-primary transition-colors dark:text-gray-400 dark:hover:text-primary font-medium cursor-pointer">
                    Terms of Service
                  </span>
                }
              />
              <PrivacyDialog
                trigger={
                  <span className="text-sm text-gray-600 hover:text-primary transition-colors dark:text-gray-400 dark:hover:text-primary font-medium cursor-pointer">
                    Privacy Policy
                  </span>
                }
              />
              <CookieDialog
                trigger={
                  <span className="text-sm text-gray-600 hover:text-primary transition-colors dark:text-gray-400 dark:hover:text-primary font-medium cursor-pointer">
                    Cookie Policy
                  </span>
                }
              />
              <a
                href="/contact"
                className="text-sm text-gray-600 hover:text-primary transition-colors dark:text-gray-400 dark:hover:text-primary font-medium"
              >
                Contact
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
