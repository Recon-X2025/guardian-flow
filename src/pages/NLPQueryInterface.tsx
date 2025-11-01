import NLPQueryExecutor from "@/components/NLPQueryExecutor";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, Sparkles, Shield } from "lucide-react";

export default function NLPQueryInterface() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Brain className="w-8 h-8 text-primary" />
            Natural Language Query Interface
          </h1>
          <p className="text-muted-foreground">Query your data using plain English</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <Sparkles className="w-5 h-5 text-primary mb-2" />
            <CardTitle className="text-lg">AI-Powered</CardTitle>
            <CardDescription>
              Advanced NLP converts your questions to optimized SQL
            </CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <Shield className="w-5 h-5 text-green-500 mb-2" />
            <CardTitle className="text-lg">Secure</CardTitle>
            <CardDescription>
              Read-only queries with automatic safety validation
            </CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <Brain className="w-5 h-5 text-blue-500 mb-2" />
            <CardTitle className="text-lg">Smart</CardTitle>
            <CardDescription>
              Learns from your query patterns for better results
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      <NLPQueryExecutor />

      <Card>
        <CardHeader>
          <CardTitle>Example Queries</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div className="text-sm p-2 bg-muted rounded">
              "Show me all open work orders assigned to John"
            </div>
            <div className="text-sm p-2 bg-muted rounded">
              "How many high priority tickets were created this week?"
            </div>
            <div className="text-sm p-2 bg-muted rounded">
              "List customers who have pending invoices"
            </div>
            <div className="text-sm p-2 bg-muted rounded">
              "Find work orders completed in the last 7 days"
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
