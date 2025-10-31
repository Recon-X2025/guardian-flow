import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Code, Key, BookOpen, Terminal, Copy, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function DeveloperPortal() {
  const [copiedText, setCopiedText] = useState<string>("");

  // TODO: Replace with real data after migration approval
  const devAccount = {
    api_quota_used: 1247,
    api_quota_limit: 10000,
    account_status: 'active',
    trial_ends_at: null
  };

  const apiKeys = [
    { id: '1', name: 'Production API Key', created_at: new Date().toISOString() },
    { id: '2', name: 'Development API Key', created_at: new Date().toISOString() }
  ];

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    toast.success(`${label} copied to clipboard`);
    setTimeout(() => setCopiedText(""), 2000);
  };

  const curlExample = `curl -X POST https://${window.location.hostname}/functions/v1/api-gateway/work-orders \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "action": "list",
    "filters": {
      "status": "completed",
      "limit": 10
    }
  }'`;

  const jsExample = `import { GuardianFlowClient } from '@guardianflow/sdk-js';

const client = new GuardianFlowClient({
  apiKey: 'YOUR_API_KEY',
  environment: 'production'
});

// Fetch work orders
const workOrders = await client.workOrders.list({
  status: 'completed',
  limit: 10
});

console.log(workOrders);`;

  const pythonExample = `from guardianflow import Client

client = Client(api_key='YOUR_API_KEY')

# Fetch work orders
work_orders = client.work_orders.list(
    status='completed',
    limit=10
)

print(work_orders)`;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Developer Portal</h1>
        <p className="text-muted-foreground">
          API documentation, SDKs, and developer resources for Guardian Flow platform
        </p>
      </div>

      {/* Account Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Quota</CardTitle>
            <Terminal className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {devAccount?.api_quota_used?.toLocaleString() || 0} / {devAccount?.api_quota_limit?.toLocaleString() || 10000}
            </div>
            <p className="text-xs text-muted-foreground">
              API calls this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Account Status</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">
              {devAccount?.account_status || 'Active'}
            </div>
            <p className="text-xs text-muted-foreground">
              {devAccount?.trial_ends_at ? `Trial ends ${new Date(devAccount.trial_ends_at).toLocaleDateString()}` : 'Full access enabled'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Keys</CardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{apiKeys.length}</div>
            <p className="text-xs text-muted-foreground">
              Active API keys
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="quickstart" className="space-y-4">
        <TabsList>
          <TabsTrigger value="quickstart">Quick Start</TabsTrigger>
          <TabsTrigger value="api-reference">API Reference</TabsTrigger>
          <TabsTrigger value="sdks">SDKs</TabsTrigger>
          <TabsTrigger value="sandbox">Sandbox</TabsTrigger>
        </TabsList>

        <TabsContent value="quickstart" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Getting Started</CardTitle>
              <CardDescription>
                Follow these steps to integrate Guardian Flow API into your application
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Step 1: Get Your API Key</h3>
                <p className="text-sm text-muted-foreground">
                  Navigate to Settings → API Keys to generate your first API key. Keep it secure and never expose it in client-side code.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Step 2: Make Your First Request</h3>
                <div className="relative">
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                    <code>{curlExample}</code>
                  </pre>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute top-2 right-2"
                    onClick={() => copyToClipboard(curlExample, "cURL example")}
                  >
                    {copiedText === "cURL example" ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Step 3: Handle the Response</h3>
                <p className="text-sm text-muted-foreground">
                  All API responses are in JSON format with consistent structure. Check the status code and handle errors appropriately.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api-reference" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>API Endpoints</CardTitle>
              <CardDescription>
                Complete reference for Guardian Flow REST API
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge>GET</Badge>
                  <code className="text-sm">/api-gateway/work-orders</code>
                </div>
                <p className="text-sm text-muted-foreground">
                  List and filter work orders. Supports pagination, sorting, and advanced filtering.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">POST</Badge>
                  <code className="text-sm">/api-gateway/work-orders</code>
                </div>
                <p className="text-sm text-muted-foreground">
                  Create a new work order with ticket information, customer details, and SLA requirements.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge>GET</Badge>
                  <code className="text-sm">/analytics-export</code>
                </div>
                <p className="text-sm text-muted-foreground">
                  Export analytics data in JSON or CSV format for BI tool integration.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge>GET</Badge>
                  <code className="text-sm">/api-gateway/customers</code>
                </div>
                <p className="text-sm text-muted-foreground">
                  Retrieve customer information and service history.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge>GET</Badge>
                  <code className="text-sm">/api-gateway/invoices</code>
                </div>
                <p className="text-sm text-muted-foreground">
                  Access invoice data, payment status, and financial reconciliation details.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sdks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Official SDKs</CardTitle>
              <CardDescription>
                Type-safe client libraries for popular programming languages
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Code className="h-5 w-5" />
                    JavaScript / TypeScript
                  </h3>
                  <Badge>v1.0.0</Badge>
                </div>
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                  <code>npm install @guardianflow/sdk-js</code>
                </pre>
                <div className="relative">
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                    <code>{jsExample}</code>
                  </pre>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute top-2 right-2"
                    onClick={() => copyToClipboard(jsExample, "JS example")}
                  >
                    {copiedText === "JS example" ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Code className="h-5 w-5" />
                    Python
                  </h3>
                  <Badge>v1.0.0</Badge>
                </div>
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                  <code>pip install guardianflow-sdk-python</code>
                </pre>
                <div className="relative">
                  <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                    <code>{pythonExample}</code>
                  </pre>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute top-2 right-2"
                    onClick={() => copyToClipboard(pythonExample, "Python example")}
                  >
                    {copiedText === "Python example" ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Code className="h-5 w-5" />
                  Java
                </h3>
                <Badge variant="outline">Coming Soon</Badge>
                <p className="text-sm text-muted-foreground">
                  Java SDK is currently in development. Join our waitlist to get notified when it's ready.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sandbox" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sandbox Environment</CardTitle>
              <CardDescription>
                Test your integrations with sample data without affecting production
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Sandbox Features</h3>
                <ul className="space-y-1 text-sm text-blue-800 dark:text-blue-200">
                  <li>• Pre-populated test data (100+ work orders, 50+ customers)</li>
                  <li>• No side effects - changes are isolated to sandbox environment</li>
                  <li>• Request/response inspector for debugging</li>
                  <li>• Rate limits: 100 requests per minute</li>
                  <li>• Data resets daily at midnight UTC</li>
                </ul>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold">Sandbox Base URL</h3>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-muted p-2 rounded text-sm">
                    https://sandbox-api.guardianflow.io/v1
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard('https://sandbox-api.guardianflow.io/v1', 'Sandbox URL')}
                  >
                    {copiedText === 'Sandbox URL' ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold">Test API Key</h3>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-muted p-2 rounded text-sm">
                    sk_test_1234567890abcdef
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard('sk_test_1234567890abcdef', 'Test API key')}
                  >
                    {copiedText === 'Test API key' ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  This is a shared test key for sandbox environment only
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Resources */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Additional Resources
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <h3 className="font-semibold">Documentation</h3>
              <p className="text-sm text-muted-foreground">
                Complete guides, tutorials, and API reference documentation
              </p>
              <Button variant="link" className="p-0 h-auto">
                View Docs →
              </Button>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold">Community</h3>
              <p className="text-sm text-muted-foreground">
                Join our developer community for support and discussions
              </p>
              <Button variant="link" className="p-0 h-auto">
                Join Discord →
              </Button>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold">Support</h3>
              <p className="text-sm text-muted-foreground">
                Get help from our technical support team
              </p>
              <Button variant="link" className="p-0 h-auto">
                Contact Support →
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
