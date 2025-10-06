import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bot, Sparkles, Zap, Brain, CheckCircle2, Activity } from 'lucide-react';

export default function ModelOrchestration() {
  const models = [
    {
      name: 'SaPOS Offer Generator',
      provider: 'Lovable AI',
      model: 'google/gemini-2.5-flash',
      status: 'active',
      description: 'Generates spare parts or service offers based on work order context',
      avgLatency: '1.2s',
      successRate: '98.5%',
      dailyCalls: 245,
    },
    {
      name: 'Photo Validation CV',
      provider: 'External GPU',
      model: 'TruFor Tamper Detection',
      status: 'active',
      description: 'Computer vision model for photo authenticity verification',
      avgLatency: '2.8s',
      successRate: '99.2%',
      dailyCalls: 892,
    },
    {
      name: 'Fraud Detection',
      provider: 'Lovable AI',
      model: 'google/gemini-2.5-pro',
      status: 'active',
      description: 'Analyzes patterns to detect potential fraudulent activities',
      avgLatency: '1.8s',
      successRate: '96.7%',
      dailyCalls: 124,
    },
    {
      name: 'Knowledge Base RAG',
      provider: 'Lovable AI',
      model: 'google/gemini-2.5-flash',
      status: 'active',
      description: 'Retrieval-augmented generation for technical documentation',
      avgLatency: '1.5s',
      successRate: '97.3%',
      dailyCalls: 567,
    },
    {
      name: 'Assistant Chatbot',
      provider: 'Lovable AI',
      model: 'google/gemini-2.5-flash',
      status: 'active',
      description: 'Conversational AI for user assistance and support',
      avgLatency: '0.9s',
      successRate: '99.1%',
      dailyCalls: 1340,
    },
  ];

  const getStatusBadge = (status: string) => {
    if (status === 'active') {
      return (
        <Badge className="bg-green-100 text-green-800">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Active
        </Badge>
      );
    }
    return <Badge variant="outline">Inactive</Badge>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Model Orchestration</h1>
        <p className="text-muted-foreground">
          AI model configuration and performance monitoring
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Models</CardTitle>
            <Bot className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{models.filter(m => m.status === 'active').length}</div>
            <p className="text-xs text-muted-foreground">Production ready</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Daily Calls</CardTitle>
            <Activity className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {models.reduce((sum, m) => sum + m.dailyCalls, 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Across all models</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Latency</CardTitle>
            <Zap className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1.4s</div>
            <p className="text-xs text-muted-foreground">p95 response time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">98.1%</div>
            <p className="text-xs text-muted-foreground">Overall reliability</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Deployed Models</CardTitle>
          <CardDescription>AI models currently in production</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {models.map((model, idx) => (
              <div
                key={idx}
                className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Brain className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{model.name}</h3>
                      <p className="text-sm text-muted-foreground">{model.description}</p>
                    </div>
                  </div>
                  {getStatusBadge(model.status)}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Provider</p>
                    <p className="font-medium">{model.provider}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Model</p>
                    <p className="font-medium text-xs">{model.model}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Avg Latency</p>
                    <p className="font-medium">{model.avgLatency}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Success Rate</p>
                    <p className="font-medium text-green-600">{model.successRate}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Daily Calls</p>
                    <p className="font-medium">{model.dailyCalls.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-primary/10 via-accent/10 to-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Lovable AI Integration
          </CardTitle>
          <CardDescription>Seamless AI capabilities without API key management</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-sm">Pre-configured Authentication</p>
                <p className="text-xs text-muted-foreground">
                  LOVABLE_API_KEY automatically provisioned - no manual setup required
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-sm">Free Gemini Usage Period</p>
                <p className="text-xs text-muted-foreground">
                  All Gemini models are free until Oct 6, 2025 - unlimited usage for development
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-sm">Model Selection</p>
                <p className="text-xs text-muted-foreground">
                  Choose from google/gemini-2.5-pro, flash, flash-lite, or OpenAI GPT-5 models
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
