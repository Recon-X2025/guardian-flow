import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Heart, TrendingDown, Users, Send, Loader2, TrendingUp } from "lucide-react";
import { apiClient } from "@/integrations/api/client";
import { toast } from "@/components/ui/sonner";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Analytics {
  npsScore: number | null;
  csat: number | null;
  responseRate: number;
  weeklyTrend: { week: string; nps: number | null; csat: number | null; responses: number }[];
}

interface CustomerScore {
  id: string;
  name: string;
  health_score: number;
  churn_risk: "low" | "medium" | "high";
  nps: number;
  usage_score: number;
  support_load: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function surveyReq<T>(endpoint: string, method = 'GET', body?: unknown): Promise<T> {
  const res = await apiClient.request<T>(`/api/surveys${endpoint}`, {
    method,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

const mockScores: CustomerScore[] = [
  { id: "c1", name: "Acme Corp",       health_score: 87, churn_risk: "low",    nps: 62, usage_score: 91, support_load: 12 },
  { id: "c2", name: "Beta Industries", health_score: 54, churn_risk: "high",   nps: 28, usage_score: 43, support_load: 48 },
  { id: "c3", name: "Gamma Holdings",  health_score: 72, churn_risk: "medium", nps: 45, usage_score: 68, support_load: 22 },
  { id: "c4", name: "Delta Systems",   health_score: 93, churn_risk: "low",    nps: 71, usage_score: 95, support_load: 5  },
];

const riskColor: Record<string, "destructive" | "default" | "secondary"> = {
  high: "destructive", medium: "default", low: "secondary",
};

// ── Weekly Trend Chart ────────────────────────────────────────────────────────

function WeeklyTrendChart({ trend }: { trend: Analytics['weeklyTrend'] }) {
  if (!trend || trend.length === 0) return <p className="text-sm text-muted-foreground">No trend data yet.</p>;

  const maxNps = 100;
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">Weekly NPS Trend</p>
      <div className="flex items-end gap-1 h-24">
        {trend.map((w, i) => {
          const npsVal = w.nps ?? 0;
          const height = Math.max(4, ((npsVal + 100) / 200) * 100);
          const color  = npsVal >= 50 ? 'bg-green-500' : npsVal >= 0 ? 'bg-amber-500' : 'bg-red-500';
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1" title={`Week ${w.week}: NPS ${w.nps ?? 'n/a'}`}>
              <div className={`w-full rounded-sm ${color}`} style={{ height: `${height}%` }} />
              <span className="text-xs text-muted-foreground" style={{ fontSize: '9px' }}>
                {w.week.slice(5)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Send Survey Dialog ────────────────────────────────────────────────────────

function SendSurveyDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [customerId, setCustomerId] = useState('');
  const [workOrderId, setWorkOrderId] = useState('');
  const [surveyType, setSurveyType] = useState<'nps' | 'csat'>('nps');
  const [sending, setSending]       = useState(false);
  const [sent, setSent]             = useState<{ token: string; surveyUrl: string } | null>(null);

  const handleSend = async () => {
    if (!customerId) return toast.error('Customer ID is required');
    setSending(true);
    try {
      const res = await surveyReq<{ token: string; surveyUrl: string }>('/send', 'POST', {
        customerId, workOrderId: workOrderId || undefined, surveyType,
      });
      setSent(res);
      toast.success('Survey sent!');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to send survey');
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setSent(null);
    setCustomerId('');
    setWorkOrderId('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Send Survey</DialogTitle></DialogHeader>
        {!sent ? (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Customer ID *</Label>
              <Input value={customerId} onChange={e => setCustomerId(e.target.value)} placeholder="cust-001" />
            </div>
            <div className="space-y-1">
              <Label>Work Order ID (optional)</Label>
              <Input value={workOrderId} onChange={e => setWorkOrderId(e.target.value)} placeholder="WO-1234" />
            </div>
            <div className="space-y-1">
              <Label>Survey Type</Label>
              <div className="flex gap-2">
                {(['nps', 'csat'] as const).map(t => (
                  <Button key={t} size="sm" variant={surveyType === t ? 'default' : 'outline'} onClick={() => setSurveyType(t)}>
                    {t.toUpperCase()}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2 text-sm">
            <p className="text-green-600 font-medium">Survey created successfully!</p>
            <p>Survey URL: <span className="font-mono text-xs bg-muted px-1 py-0.5 rounded">{sent.surveyUrl}</span></p>
            <p className="text-muted-foreground text-xs">Share this link with the customer to collect their feedback.</p>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Close</Button>
          {!sent && (
            <Button onClick={handleSend} disabled={sending || !customerId}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              Send Survey
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CustomerSuccess() {
  const [tab, setTab]               = useState("scores");
  const [analytics, setAnalytics]   = useState<Analytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [showSendSurvey, setShowSendSurvey] = useState(false);

  const highRisk = mockScores.filter(s => s.churn_risk === "high").length;

  const loadAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    try {
      const data = await surveyReq<Analytics>('/analytics');
      setAnalytics(data);
    } catch {
      // Analytics not critical — show empty state
    } finally {
      setAnalyticsLoading(false);
    }
  }, []);

  useEffect(() => { loadAnalytics(); }, [loadAnalytics]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Customer Success Analytics</h1>
          <p className="text-muted-foreground">Health scores, churn risk, NPS/CSAT, and cohort analysis</p>
        </div>
        <Button size="sm" onClick={() => setShowSendSurvey(true)}>
          <Send className="h-4 w-4 mr-2" />Send Survey
        </Button>
      </div>

      {/* NPS/CSAT summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Total Customers</p>
            <p className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />{mockScores.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">High Churn Risk</p>
            <p className="text-2xl font-bold flex items-center gap-2 text-red-600">
              <TrendingDown className="h-5 w-5" />{highRisk}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">NPS Score</p>
            {analyticsLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mt-1" />
            ) : (
              <p className={`text-2xl font-bold flex items-center gap-2 ${(analytics?.npsScore ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                <TrendingUp className="h-5 w-5" />
                {analytics?.npsScore !== null && analytics?.npsScore !== undefined ? analytics.npsScore : '—'}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">CSAT Avg / Response Rate</p>
            {analyticsLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mt-1" />
            ) : (
              <p className="text-2xl font-bold flex items-center gap-2 text-green-600">
                <Heart className="h-5 w-5" />
                {analytics?.csat !== null && analytics?.csat !== undefined ? analytics.csat.toFixed(1) : '—'}
                <span className="text-sm font-normal text-muted-foreground ml-1">({analytics?.responseRate ?? 0}%)</span>
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="scores">Health Scores</TabsTrigger>
          <TabsTrigger value="nps-trend">NPS Trend</TabsTrigger>
          <TabsTrigger value="cohorts">Cohorts</TabsTrigger>
        </TabsList>

        <TabsContent value="scores" className="space-y-3 mt-4">
          {[...mockScores].sort((a, b) => b.health_score - a.health_score).map(s => (
            <Card key={s.id}>
              <CardContent className="py-3 space-y-2">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-sm">{s.name}</p>
                    <p className="text-xs text-muted-foreground">NPS: {s.nps} · Support tickets: {s.support_load}/mo</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={riskColor[s.churn_risk]}>Churn: {s.churn_risk}</Badge>
                    <span className="text-sm font-bold">{s.health_score}</span>
                  </div>
                </div>
                <Progress value={s.health_score} />
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="nps-trend" className="mt-4">
          {analyticsLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : analytics ? (
            <Card>
              <CardHeader><CardTitle className="text-sm">NPS / CSAT Weekly Trend</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <WeeklyTrendChart trend={analytics.weeklyTrend} />
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">NPS</p>
                    <p className="text-xl font-bold">
                      {analytics.npsScore !== null ? analytics.npsScore : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">CSAT</p>
                    <p className="text-xl font-bold">
                      {analytics.csat !== null ? analytics.csat?.toFixed(1) : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Response Rate</p>
                    <p className="text-xl font-bold">{analytics.responseRate}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground text-sm">
                No survey data yet. Send surveys to customers to see NPS trends.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="cohorts" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Cohort Analysis</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                No cohort data available yet. Cohort breakdown by segment and tenure will appear here once customer data is collected.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <SendSurveyDialog open={showSendSurvey} onOpenChange={setShowSendSurvey} />
    </div>
  );
}
