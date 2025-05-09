import { Switch, Route,Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import AuthPage from "@/pages/auth-page";
import Optin from "@/pages/opt-in";
import Dashboard from "@/pages/dashboard";
import Profile from "@/pages/profile";
import AdminDashboard from "@/pages/admin-dashboard";
import { useUser } from "@/hooks/use-user";
import { Loader2 } from "lucide-react";
import { UrlParamDialogs } from "@/components/url-param-dialogs"; // Import the new component
import ResetPasswordPage from "./pages/reset-password";
function Router() {
  const { user, isLoading } = useUser();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/auth" component={AuthPage} />
        <Route path="/opt-in" component={Optin} />
        <Route path="/reset-password" component={ResetPasswordPage} />
        <Route component={Landing} />
      </Switch>
    );
  }

  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/profile" component={Profile} />
      <Route path="/auth">
        <Redirect to="/" />
      </Route>
      <Route 
        path="/admin" 
        component={() => {
          if (user.role !== 'admin') {
            return <NotFound />;
          }
          return <AdminDashboard />;
        }} 
      />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
      <UrlParamDialogs /> {/* This will show the dialogs based on URL params */}
    </QueryClientProvider>
  );
}

export default App;