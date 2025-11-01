import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Database, Lock } from "lucide-react";

export default function AnalyticsPlatformAuth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      toast.success("Successfully logged in to Analytics Platform");
      navigate("/analytics-platform");
    } catch (error: any) {
      toast.error(error.message || "Failed to login");
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = async (role: string) => {
    setIsLoading(true);
    const credentials = {
      data_engineer: { email: "data.engineer@analytics.gf", password: "Analytics2025!" },
      data_scientist: { email: "data.scientist@analytics.gf", password: "Analytics2025!" },
      business_analyst: { email: "business.analyst@analytics.gf", password: "Analytics2025!" },
      compliance_officer: { email: "compliance.officer@analytics.gf", password: "Analytics2025!" },
      security_admin: { email: "security.admin@analytics.gf", password: "Analytics2025!" },
      it_operations: { email: "it.ops@analytics.gf", password: "Analytics2025!" },
      executive: { email: "executive@analytics.gf", password: "Analytics2025!" },
    }[role];

    if (!credentials) return;

    try {
      const { error } = await supabase.auth.signInWithPassword(credentials);
      if (error) throw error;

      toast.success(`Logged in as ${role.replace('_', ' ')}`);
      navigate("/analytics-platform");
    } catch (error: any) {
      toast.error(error.message || "Failed to login");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10">
      <Card className="w-full max-w-4xl p-8 mx-4">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="p-3 bg-primary/10 rounded-lg">
            <Database className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Enterprise Data Analytics Platform</h1>
            <p className="text-muted-foreground">Guardian Flow Extension Module</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Manual Login */}
          <div>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Module Access
            </h2>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@analytics.gf"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Logging in..." : "Login to Analytics Platform"}
              </Button>
            </form>
          </div>

          {/* Quick Role Access */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Test User Access</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Quick login with role-specific test credentials:
            </p>
            <div className="space-y-2">
              {[
                { role: "data_engineer", label: "Data Engineer", desc: "Pipeline & ETL management" },
                { role: "data_scientist", label: "Data Scientist", desc: "ML model development" },
                { role: "business_analyst", label: "Business Analyst", desc: "Dashboard creation" },
                { role: "compliance_officer", label: "Compliance Officer", desc: "Audit & evidence" },
                { role: "security_admin", label: "Security Admin", desc: "Access & encryption" },
                { role: "it_operations", label: "IT Operations", desc: "System monitoring" },
                { role: "executive", label: "Executive", desc: "KPI & reports" },
              ].map(({ role, label, desc }) => (
                <Button
                  key={role}
                  variant="outline"
                  className="w-full justify-start text-left h-auto py-3"
                  onClick={() => handleQuickLogin(role)}
                  disabled={isLoading}
                >
                  <div>
                    <div className="font-medium">{label}</div>
                    <div className="text-xs text-muted-foreground">{desc}</div>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t text-center">
          <p className="text-sm text-muted-foreground">
            All test accounts use password: <code className="bg-muted px-2 py-1 rounded">Analytics2025!</code>
          </p>
        </div>
      </Card>
    </div>
  );
}