/**
 * @file src/domains/workOrders/pages/ScheduleOptimiser.tsx
 * @description Constraint-based schedule optimiser UI — Sprint 7-8.
 *
 * Features:
 * - Date picker + "Run Optimiser" button
 * - Assignment table with WO title, technician, skill match %, constraint violations
 * - Accept / Override per assignment; "Accept All" bulk action
 * - Constraint violation badges (SLA_JEOPARDY, MISSING_SKILL, EXPIRED_CERTIFICATION)
 */

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/integrations/api/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Loader2, Zap, CheckCheck, Check, RefreshCw } from "lucide-react";
import { toast } from "@/domains/shared/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// ── Types ─────────────────────────────────────────────────────────────────────

type ViolationLabel = "SLA_JEOPARDY" | "MISSING_SKILL" | "EXPIRED_CERTIFICATION" | string;

interface ScheduleAssignment {
  id: string;
  work_order_id: string;
  work_order_title: string;
  technician_id: string;
  technician_name: string;
  score: number;
  skill_match_percent: number;
  constraint_violations: ViolationLabel[];
  status: "proposed" | "accepted" | "overridden";
  alternatives?: Array<{
    technicianId: string;
    technicianName: string;
    score: number;
    violations: ViolationLabel[];
  }>;
}

interface OptimiseResult {
  runId: string;
  assignments: ScheduleAssignment[];
  unassigned: Array<{ workOrder: { id: string; title: string }; reason: string }>;
  solverMeta: {
    date: string;
    solvedAt: string;
    algorithm: string;
    totalWOs: number;
    totalTechs: number;
    assignedCount: number;
  };
}

// ── Violation badge helper ────────────────────────────────────────────────────

const VIOLATION_STYLES: Record<string, { label: string; variant: "destructive" | "secondary" | "outline" }> = {
  SLA_JEOPARDY:          { label: "SLA Jeopardy",          variant: "destructive" },
  MISSING_SKILL:         { label: "Missing Skill",         variant: "destructive" },
  EXPIRED_CERTIFICATION: { label: "Expired Cert",          variant: "secondary"   },
};

function ViolationBadges({ violations }: { violations: ViolationLabel[] }) {
  if (!violations || violations.length === 0) return <span className="text-muted-foreground text-xs">None</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {violations.map(v => {
        const style = VIOLATION_STYLES[v] ?? { label: v, variant: "outline" as const };
        return (
          <Badge key={v} variant={style.variant} className="text-xs">
            {style.label}
          </Badge>
        );
      })}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ScheduleOptimiser() {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [runResult, setRunResult] = useState<OptimiseResult | null>(null);

  const dateStr = selectedDate.toISOString().split("T")[0];

  // Fetch existing assignments for the selected date
  const { data: savedAssignments, refetch: refetchAssignments } = useQuery({
    queryKey: ["schedule-assignments", dateStr],
    queryFn: async () => {
      const res = await apiClient.request<{ assignments: ScheduleAssignment[] }>(
        `/api/schedule/assignments?date=${dateStr}`,
      );
      return res.data?.assignments ?? [];
    },
  });

  // Derive displayed assignments: prefer the latest solver run, else saved list
  const displayedAssignments: ScheduleAssignment[] =
    runResult?.assignments ?? savedAssignments ?? [];

  // Run optimiser mutation
  const optimiseMutation = useMutation({
    mutationFn: async (date: string) => {
      const res = await apiClient.request<OptimiseResult>("/api/schedule/optimize", {
        method: "POST",
        body: JSON.stringify({ date }),
      });
      if (res.error) throw new Error(res.error.message);
      return res.data as OptimiseResult;
    },
    onSuccess: (data) => {
      setRunResult(data);
      queryClient.invalidateQueries({ queryKey: ["schedule-assignments", dateStr] });
      toast({
        title: "Optimiser complete",
        description: `${data.assignments.length} assignments generated for ${dateStr}`,
      });
    },
    onError: (err: Error) => {
      toast({ title: "Optimiser failed", description: err.message, variant: "destructive" });
    },
  });

  // Accept / override mutation
  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      action,
      override_technician_id,
      override_technician_name,
    }: {
      id: string;
      action: "accept" | "override";
      override_technician_id?: string;
      override_technician_name?: string;
    }) => {
      const res = await apiClient.request<{ assignment: ScheduleAssignment }>(
        `/api/schedule/assignments/${id}`,
        {
          method: "PUT",
          body: JSON.stringify({ action, override_technician_id, override_technician_name }),
        },
      );
      if (res.error) throw new Error(res.error.message);
      return res.data?.assignment;
    },
    onSuccess: (updated) => {
      // Update in local runResult if present
      if (runResult && updated) {
        setRunResult(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            assignments: prev.assignments.map(a => (a.id === updated.id ? updated : a)),
          };
        });
      }
      refetchAssignments();
      toast({ title: "Assignment updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    },
  });

  const handleAcceptAll = () => {
    const proposed = displayedAssignments.filter(a => a.status === "proposed");
    if (proposed.length === 0) {
      toast({ title: "No proposed assignments to accept" });
      return;
    }
    proposed.forEach(a => updateMutation.mutate({ id: a.id, action: "accept" }));
  };

  const pendingCount = displayedAssignments.filter(a => a.status === "proposed").length;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Zap className="w-8 h-8 text-primary" />
            Schedule Optimiser
          </h1>
          <p className="text-muted-foreground">Constraint-based greedy scheduling solver</p>
        </div>
        {pendingCount > 0 && (
          <Button
            onClick={handleAcceptAll}
            disabled={updateMutation.isPending}
            className="gap-2"
          >
            <CheckCheck className="w-4 h-4" />
            Accept All ({pendingCount})
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Date picker + run button */}
        <Card>
          <CardHeader>
            <CardTitle>Select Date</CardTitle>
            <CardDescription>Choose the scheduling date</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={date => date && setSelectedDate(date)}
              className="rounded-md border"
            />
            <Button
              className="w-full gap-2"
              onClick={() => optimiseMutation.mutate(dateStr)}
              disabled={optimiseMutation.isPending}
            >
              {optimiseMutation.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Solving…</>
              ) : (
                <><Zap className="w-4 h-4" /> Run Optimiser</>
              )}
            </Button>
            {runResult && (
              <div className="text-xs text-muted-foreground space-y-1 border rounded p-2">
                <div><span className="font-medium">Date:</span> {runResult.solverMeta.date}</div>
                <div><span className="font-medium">WOs:</span> {runResult.solverMeta.totalWOs}</div>
                <div><span className="font-medium">Techs:</span> {runResult.solverMeta.totalTechs}</div>
                <div><span className="font-medium">Assigned:</span> {runResult.solverMeta.assignedCount}</div>
                {runResult.unassigned.length > 0 && (
                  <div className="text-destructive">
                    Unassigned: {runResult.unassigned.length}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Assignments table */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Assignments</CardTitle>
                <CardDescription>
                  {displayedAssignments.length
                    ? `${displayedAssignments.length} assignment(s) for ${dateStr}`
                    : "Run the optimiser to generate assignments"}
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={() => refetchAssignments()}
              >
                <RefreshCw className="w-3 h-3" /> Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {displayedAssignments.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Zap className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>No assignments yet. Select a date and run the optimiser.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Work Order</TableHead>
                      <TableHead>Technician</TableHead>
                      <TableHead className="text-right">Skill Match</TableHead>
                      <TableHead className="text-right">Score</TableHead>
                      <TableHead>Violations</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayedAssignments.map(assignment => (
                      <TableRow key={assignment.id}>
                        <TableCell className="font-medium max-w-[160px] truncate">
                          {assignment.work_order_title || assignment.work_order_id}
                        </TableCell>
                        <TableCell className="max-w-[140px] truncate">
                          {assignment.technician_name || assignment.technician_id}
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={
                              assignment.skill_match_percent === 100
                                ? "text-green-600 font-medium"
                                : assignment.skill_match_percent >= 50
                                ? "text-yellow-600"
                                : "text-destructive"
                            }
                          >
                            {assignment.skill_match_percent ?? "—"}%
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-sm font-mono">
                          {assignment.score != null ? assignment.score.toFixed(1) : "—"}
                        </TableCell>
                        <TableCell>
                          <ViolationBadges violations={assignment.constraint_violations ?? []} />
                        </TableCell>
                        <TableCell>
                          {assignment.status === "accepted" ? (
                            <Badge variant="default">Accepted</Badge>
                          ) : assignment.status === "overridden" ? (
                            <Badge variant="secondary">Overridden</Badge>
                          ) : (
                            <Badge variant="outline">Proposed</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {assignment.status === "proposed" && (
                            <div className="flex justify-end gap-1">
                              <Button
                                size="sm"
                                variant="default"
                                className="h-7 gap-1 text-xs"
                                disabled={updateMutation.isPending}
                                onClick={() =>
                                  updateMutation.mutate({ id: assignment.id, action: "accept" })
                                }
                              >
                                <Check className="w-3 h-3" /> Accept
                              </Button>
                              {assignment.alternatives && assignment.alternatives.length > 0 && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 gap-1 text-xs"
                                  disabled={updateMutation.isPending}
                                  onClick={() => {
                                    const alt = assignment.alternatives![0];
                                    updateMutation.mutate({
                                      id: assignment.id,
                                      action: "override",
                                      override_technician_id:   alt.technicianId,
                                      override_technician_name: alt.technicianName,
                                    });
                                  }}
                                >
                                  Override
                                </Button>
                              )}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
