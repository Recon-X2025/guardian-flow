import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Code, Zap, Shield, Globe, CheckCircle, ArrowRight } from "lucide-react";

export default function DeveloperLanding() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const createSandbox = async () => {
    if (!email || !name) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please provide both email and name",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-sandbox-tenant', {
        body: { email, name }
      });

      if (error) throw error;

      toast({
        title: "Sandbox Created!",
        description: `Your sandbox environment is ready. API Key: ${data.api_key.substring(0, 12)}...`,
        duration: 10000,
      });

      // Optionally navigate to docs or console
      setTimeout(() => {
        navigate('/developer-console');
      }, 3000);

    } catch (error: any) {
      console.error('Sandbox creation error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to create sandbox environment",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16 md:py-24">
        <div className="text-center max-w-4xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium mb-4">
            <Zap className="h-4 w-4" />
            Build on Guardian Flow Platform
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            Agentic AI for <br />
            <span className="text-primary">Field Intelligence</span>
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Access powerful APIs for operations orchestration, fraud detection, finance management, and demand forecasting. Built for scale.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
            <Button size="lg" onClick={() => navigate('/developer-console')}>
              Developer Console
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => window.open('https://docs.guardianflow.dev', '_blank')}>
              View API Docs
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-20">
          <Card>
            <CardHeader>
              <Code className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Agent APIs</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Pre-built intelligent agents for ops, fraud, finance, and forecasting
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Zap className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Real-time</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Low-latency API responses with sub-second processing times
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Shield className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Secure</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Enterprise-grade security with API key authentication and rate limiting
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Globe className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Multi-tenant</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Isolated environments with tenant-level data segregation
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Sandbox Section */}
        <Card className="max-w-2xl mx-auto mt-20">
          <CardHeader>
            <CardTitle>Try Guardian Flow Sandbox</CardTitle>
            <CardDescription>
              Get instant access to a demo environment with preloaded data. No credit card required.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <Button 
              onClick={createSandbox} 
              disabled={loading}
              className="w-full"
              size="lg"
            >
              {loading ? "Creating..." : "Create Sandbox Environment"}
            </Button>

            <div className="text-xs text-muted-foreground space-y-1">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                7-day validity with 500 API calls/day
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Instant API key generation
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Preloaded with demo work orders
              </div>
            </div>
          </CardContent>
        </Card>

        {/* API Endpoints Overview */}
        <div className="mt-20 space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-4">Available API Endpoints</h2>
            <p className="text-muted-foreground">Access powerful agents via simple REST APIs</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle>/api/agent/ops</CardTitle>
                <CardDescription>Operations Orchestration</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm space-y-2 text-muted-foreground">
                  <li>• Create & manage work orders</li>
                  <li>• Auto-release with prechecks</li>
                  <li>• Status tracking & updates</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>/api/agent/fraud</CardTitle>
                <CardDescription>Fraud Detection & Validation</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm space-y-2 text-muted-foreground">
                  <li>• Photo validation with AI</li>
                  <li>• Anomaly detection scoring</li>
                  <li>• Investigation management</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>/api/agent/finance</CardTitle>
                <CardDescription>Finance & Billing</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm space-y-2 text-muted-foreground">
                  <li>• Partner payout calculation</li>
                  <li>• Penalty management</li>
                  <li>• Invoice generation</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>/api/agent/forecast</CardTitle>
                <CardDescription>Demand Forecasting</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm space-y-2 text-muted-foreground">
                  <li>• Hierarchical forecasts</li>
                  <li>• Geography × Product granularity</li>
                  <li>• Real-time reconciliation</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
