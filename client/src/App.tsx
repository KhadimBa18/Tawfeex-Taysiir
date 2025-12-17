import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Classes from "@/pages/classes";
import Students from "@/pages/students";
import Evaluations from "@/pages/evaluations";
import Bulletins from "@/pages/bulletins";
import Stats from "@/pages/stats";
import Personnel from "@/pages/personnel";
import Settings from "@/pages/settings";
import Layout from "@/components/layout";
import { Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

// Placeholder pages
const Placeholder = ({ title }: { title: string }) => (
  <div className="p-8 text-center border-2 border-dashed rounded-xl">
    <h2 className="text-2xl font-bold text-muted-foreground">{title}</h2>
    <p className="text-muted-foreground mt-2">Module en cours de développement...</p>
  </div>
);

function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });
  }, []);

  if (!deferredPrompt) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Button 
        onClick={() => {
          deferredPrompt.prompt();
          setDeferredPrompt(null);
        }}
        className="shadow-lg gap-2"
      >
        <Download className="w-4 h-4" /> Installer l'Application
      </Button>
    </div>
  );
}

function ProtectedRoute({ component: Component, ...rest }: any) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  return (
    <Layout>
      <Component {...rest} />
      <InstallPrompt />
    </Layout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      
      <Route path="/">
        {() => <ProtectedRoute component={Dashboard} />}
      </Route>
      
      <Route path="/personnel">
        {() => <ProtectedRoute component={Personnel} />}
      </Route>
      
      <Route path="/classes">
        {() => <ProtectedRoute component={Classes} />}
      </Route>
      
      <Route path="/students">
        {() => <ProtectedRoute component={Students} />}
      </Route>
      
      <Route path="/evaluations">
        {() => <ProtectedRoute component={Evaluations} />}
      </Route>
      
      <Route path="/bulletins">
        {() => <ProtectedRoute component={Bulletins} />}
      </Route>
      
      <Route path="/stats">
        {() => <ProtectedRoute component={Stats} />}
      </Route>

      <Route path="/settings">
        {() => <ProtectedRoute component={Settings} />}
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Router />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
