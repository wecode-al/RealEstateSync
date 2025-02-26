import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { insertUserSchema, type InsertUser } from "@shared/schema";
import { Home } from "lucide-react";

export default function AuthPage() {
  const [, navigate] = useLocation();
  const { user, loginMutation, registerMutation } = useAuth();
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");

  const loginForm = useForm({
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const registerForm = useForm<InsertUser>({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      username: "",
      password: "",
      email: "",
    },
  });

  // Move useEffect logic into a regular if statement after all hooks are called
  if (user) {
    navigate("/");
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left column with forms */}
      <div className="flex-1 flex items-center justify-center p-8">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Welcome to Property Manager</CardTitle>
            <CardDescription>
              Manage and distribute your property listings across multiple platforms
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "login" | "register")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <Form {...loginForm}>
                  <form
                    onSubmit={loginForm.handleSubmit((data) => loginMutation.mutate(data))}
                    className="space-y-4"
                  >
                    <div className="space-y-2">
                      <Input
                        {...loginForm.register("username")}
                        placeholder="Username"
                      />
                      <Input
                        {...loginForm.register("password")}
                        type="password"
                        placeholder="Password"
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? "Logging in..." : "Login"}
                    </Button>
                  </form>
                </Form>
              </TabsContent>

              <TabsContent value="register">
                <Form {...registerForm}>
                  <form
                    onSubmit={registerForm.handleSubmit((data) => registerMutation.mutate(data))}
                    className="space-y-4"
                  >
                    <div className="space-y-2">
                      <Input
                        {...registerForm.register("username")}
                        placeholder="Username"
                      />
                      <Input
                        {...registerForm.register("email")}
                        type="email"
                        placeholder="Email"
                      />
                      <Input
                        {...registerForm.register("password")}
                        type="password"
                        placeholder="Password"
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={registerMutation.isPending}
                    >
                      {registerMutation.isPending ? "Creating account..." : "Register"}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Right column with hero section */}
      <div className="hidden lg:flex flex-1 bg-muted items-center justify-center p-8">
        <div className="max-w-lg text-center">
          <Home className="mx-auto h-16 w-16 mb-6" />
          <h1 className="text-4xl font-bold mb-4">
            Streamline Your Property Management
          </h1>
          <p className="text-lg text-muted-foreground">
            List and manage your properties across multiple platforms with ease.
            Reach more potential buyers and renters with our integrated distribution system.
          </p>
        </div>
      </div>
    </div>
  );
}