import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart3, 
  FileSpreadsheet, 
  Database, 
  Download, 
  Key,
  ExternalLink,
  CheckCircle,
  Copy,
  Code
} from 'lucide-react';
import { useToast } from '@/domains/shared/hooks/use-toast';

export default function AnalyticsIntegrations() {
  const { toast } = useToast();
  const [apiKey, setApiKey] = useState('gf_live_1234567890abcdef');

  const platforms = [
    {
      name: 'PowerBI',
      icon: BarChart3,
      status: 'Production Ready',
      description: 'Direct query and scheduled exports for enterprise BI',
      features: ['Real-time refresh', 'Custom DAX measures', 'Data-level security'],
      color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20'
    },
    {
      name: 'Tableau',
      icon: Database,
      status: 'Production Ready',
      description: 'Web Data Connector with interactive visualizations',
      features: ['Drag-and-drop interface', 'Calculated fields', 'Live connections'],
      color: 'bg-blue-500/10 text-blue-600 border-blue-500/20'
    },
    {
      name: 'Looker',
      icon: Code,
      status: 'Production Ready',
      description: 'LookML models for advanced data modeling',
      features: ['Git version control', 'Embedded analytics', 'Custom explores'],
      color: 'bg-purple-500/10 text-purple-600 border-purple-500/20'
    },
    {
      name: 'Excel',
      icon: FileSpreadsheet,
      status: 'Production Ready',
      description: 'Power Query and Power Pivot integration',
      features: ['One-click refresh', 'Pivot tables', 'Formula support'],
      color: 'bg-green-500/10 text-green-600 border-green-500/20'
    },
    {
      name: 'Google Data Studio',
      icon: BarChart3,
      status: 'Production Ready',
      description: 'Community connector with pre-built templates',
      features: ['Free to use', 'Real-time collaboration', 'Auto-refresh'],
      color: 'bg-red-500/10 text-red-600 border-red-500/20'
    }
  ];

  const datasets = [
    { id: 'sla_metrics', name: 'SLA Metrics', records: '15,000+', refresh: '6 hours' },
    { id: 'financial_data', name: 'Financial Data', records: '8,500+', refresh: 'Daily' },
    { id: 'forecast_accuracy', name: 'Forecast Accuracy', records: '50,000+', refresh: 'Daily' },
    { id: 'fraud_analytics', name: 'Fraud Analytics', records: '1,200+', refresh: 'Hourly' },
    { id: 'operational_metrics', name: 'Operational Metrics', records: '25,000+', refresh: '6 hours' },
    { id: 'workforce_analytics', name: 'Workforce Analytics', records: '3,500+', refresh: 'Daily' }
  ];

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied!',
      description: `${label} copied to clipboard`,
    });
  };

  const powerBIQuery = `let
    Source = Json.Document(Web.Contents(
        "https://your-guardian-flow.com/api/analytics-export",
        [
            Headers=[
                #"x-api-key"="${apiKey}",
                #"Content-Type"="application/json"
            ],
            Content=Text.ToBinary("{
                \\"dataset\\": \\"sla_metrics\\",
                \\"format\\": \\"json\\"
            }")
        ]
    ))
in
    Source`;

  const curlExample = `curl -X POST https://your-guardian-flow.com/api/analytics-export \\
  -H "x-api-key: ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "dataset": "sla_metrics",
    "format": "json",
    "filters": {
      "start_date": "2025-01-01"
    }
  }'`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Analytics Integrations</h1>
          <p className="text-muted-foreground">
            Connect Guardian Flow with leading BI platforms
          </p>
        </div>
        <Button variant="outline" onClick={() => window.open('/docs/ANALYTICS_INTEGRATION_GUIDE.md', '_blank')}>
          <ExternalLink className="h-4 w-4 mr-2" />
          Full Documentation
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Active Integrations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5</div>
            <p className="text-xs text-muted-foreground">Production ready platforms</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Available Datasets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">6</div>
            <p className="text-xs text-muted-foreground">Real-time & batch exports</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">API Calls (30d)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12,450</div>
            <p className="text-xs text-muted-foreground">Within rate limits</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            API Key Configuration
          </CardTitle>
          <CardDescription>Use this key to authenticate analytics exports</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-3 py-2 bg-muted rounded font-mono text-sm">
              {apiKey}
            </code>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => copyToClipboard(apiKey, 'API Key')}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            ⚠️ Keep your API key secure. Do not share it publicly or commit to version control.
          </p>
        </CardContent>
      </Card>

      <Tabs defaultValue="platforms" className="space-y-4">
        <TabsList>
          <TabsTrigger value="platforms">Platforms</TabsTrigger>
          <TabsTrigger value="datasets">Datasets</TabsTrigger>
          <TabsTrigger value="quickstart">Quick Start</TabsTrigger>
          <TabsTrigger value="examples">Code Examples</TabsTrigger>
        </TabsList>

        <TabsContent value="platforms" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {platforms.map((platform) => {
              const Icon = platform.icon;
              return (
                <Card key={platform.name} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-muted rounded-lg">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{platform.name}</CardTitle>
                          <Badge variant="outline" className={platform.color}>
                            <CheckCircle className="h-3 w-3 mr-1" />
                            {platform.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <CardDescription>{platform.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Key Features:</div>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {platform.features.map((feature, idx) => (
                          <li key={idx} className="flex items-center gap-2">
                            <CheckCircle className="h-3 w-3 text-primary" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <Button className="w-full mt-4" variant="outline" onClick={() => toast({ title: "Setup Guide", description: `Downloading ${platform.name} setup guide...` })}>
                      <Download className="h-4 w-4 mr-2" />
                      Setup Guide
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="datasets" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Available Datasets</CardTitle>
              <CardDescription>Export any of these datasets to your BI platform</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {datasets.map((dataset) => (
                  <div
                    key={dataset.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="font-medium">{dataset.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {dataset.records} records • Auto-refresh: {dataset.refresh}
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => toast({ title: dataset.name, description: `${dataset.records} records - Refresh: ${dataset.refresh}` })}>
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quickstart" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Quick Start Guide</CardTitle>
              <CardDescription>Get started in 3 simple steps</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold">
                    1
                  </div>
                  <div>
                    <div className="font-medium">Generate API Key</div>
                    <div className="text-sm text-muted-foreground">
                      Your API key is shown above. Keep it secure.
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold">
                    2
                  </div>
                  <div>
                    <div className="font-medium">Choose Your Platform</div>
                    <div className="text-sm text-muted-foreground">
                      Select from PowerBI, Tableau, Looker, Excel, or Google Data Studio
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold">
                    3
                  </div>
                  <div>
                    <div className="font-medium">Connect & Visualize</div>
                    <div className="text-sm text-muted-foreground">
                      Use provided code samples to connect and start building dashboards
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <Button className="w-full" onClick={() => toast({ title: "Downloading", description: "Complete setup guide downloaded" })}>
                  <Download className="h-4 w-4 mr-2" />
                  Download Complete Setup Guide
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="examples" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>PowerBI Power Query</CardTitle>
              <CardDescription>Copy this into PowerBI's Advanced Editor</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <pre className="p-4 bg-muted rounded-lg overflow-x-auto text-sm">
                  <code>{powerBIQuery}</code>
                </pre>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(powerBIQuery, 'PowerBI Query')}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>cURL Example</CardTitle>
              <CardDescription>Test the API from command line</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <pre className="p-4 bg-muted rounded-lg overflow-x-auto text-sm">
                  <code>{curlExample}</code>
                </pre>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard(curlExample, 'cURL Command')}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle>Need Help?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>📚 <a href="/docs" className="text-primary hover:underline">Full API Documentation</a></p>
          <p>💬 <a href="/support" className="text-primary hover:underline">Join Community Slack #analytics-integrations</a></p>
          <p>📧 <a href="mailto:analytics@guardian-flow.com" className="text-primary hover:underline">Email: analytics@guardian-flow.com</a></p>
          <p>🎥 <a href="/tutorials" className="text-primary hover:underline">Video Tutorials & Webinars</a></p>
        </CardContent>
      </Card>
    </div>
  );
}
