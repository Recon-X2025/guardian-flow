import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { AppLayout } from "@/components/AppLayout";
import { Database, Shield, Key, FileCheck, Clock, AlertTriangle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AnalyticsWorkspaces } from "@/components/analytics-platform/AnalyticsWorkspaces";
import { AnalyticsDataSources } from "@/components/analytics-platform/AnalyticsDataSources";
import { AnalyticsJITAccess } from "@/components/analytics-platform/AnalyticsJITAccess";
import { AnalyticsCompliance } from "@/components/analytics-platform/AnalyticsCompliance";
import { AnalyticsAuditLogs } from "@/components/analytics-platform/AnalyticsAuditLogs";
import { AnalyticsSecurity } from "@/components/analytics-platform/AnalyticsSecurity";

export default function AnalyticsPlatform() {
  const [activeTab, setActiveTab] = useState("workspaces");

  // Fetch workspaces
  const { data: workspaces, isLoading } = useQuery({
    queryKey: ["analytics-workspaces"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("analytics-workspace-manager", {
        body: { action: "get_workspaces" },
      });
      if (error) throw error;
      return data.workspaces;
    },
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Enterprise Analytics Platform</h1>
            <p className="text-muted-foreground mt-1">
              Secure, scalable data analytics for enterprise workloads
            </p>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Database className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Workspaces</p>
                <p className="text-2xl font-bold">
                  {workspaces?.filter((w: any) => w.status === 'active').length || 0}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500/10 rounded-lg">
                <Shield className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Security Score</p>
                <p className="text-2xl font-bold">98%</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <FileCheck className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Compliance Status</p>
                <p className="text-2xl font-bold">SOC 2</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-500/10 rounded-lg">
                <Clock className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending Access</p>
                <p className="text-2xl font-bold">3</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="workspaces">Workspaces</TabsTrigger>
            <TabsTrigger value="data-sources">Data Sources</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="access">JIT Access</TabsTrigger>
            <TabsTrigger value="compliance">Compliance</TabsTrigger>
            <TabsTrigger value="audit">Audit Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="workspaces" className="space-y-4">
            <AnalyticsWorkspaces workspaces={workspaces} isLoading={isLoading} />
          </TabsContent>

          <TabsContent value="data-sources" className="space-y-4">
            <AnalyticsDataSources />
          </TabsContent>

          <TabsContent value="security" className="space-y-4">
            <AnalyticsSecurity />
          </TabsContent>

          <TabsContent value="access" className="space-y-4">
            <AnalyticsJITAccess />
          </TabsContent>

          <TabsContent value="compliance" className="space-y-4">
            <AnalyticsCompliance />
          </TabsContent>

          <TabsContent value="audit" className="space-y-4">
            <AnalyticsAuditLogs />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
