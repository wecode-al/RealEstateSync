import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import { Layout } from "@/components/layout";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import AddProperty from "@/pages/add-property";
import Settings from "@/pages/settings";
import AuthPage from "@/pages/auth";
import EditProperty from "@/pages/edit-property";
import ImportProperty from "@/pages/import-property";
import ConnectionWizard from "@/pages/connection-wizard";

// Define props type for EditProperty component
type EditPropertyProps = {
  params: {
    id: string;
  };
};

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <Route>
        <Layout>
          <Switch>
            <ProtectedRoute path="/" component={Home} />
            <ProtectedRoute path="/add-property" component={AddProperty} />
            <ProtectedRoute path="/import-property" component={ImportProperty} />
            <ProtectedRoute 
              path="/edit-property/:id" 
              component={({ params }: EditPropertyProps) => <EditProperty params={params} />} 
            />
            <ProtectedRoute path="/settings" component={Settings} />
            <ProtectedRoute path="/connection-wizard" component={ConnectionWizard} />
            <Route component={NotFound} />
          </Switch>
        </Layout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;