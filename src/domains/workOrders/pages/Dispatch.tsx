import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Truck, MapPin, Clock, Package, CheckCircle2, AlertTriangle, Navigation, EyeOff, LayoutList, GanttChart } from 'lucide-react';
import { apiClient } from '@/integrations/api/client';
import { useToast } from '@/domains/shared/hooks/use-toast';
import { GeoCheckInDialog } from '@/domains/workOrders/components/GeoCheckInDialog';
import { useActionPermissions } from '@/domains/auth/hooks/useActionPermissions';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useRBAC } from '@/domains/auth/contexts/RBACContext';

interface DispatchWorkOrder {
  id: string;
  wo_number?: string;
  status: string;
  technician_id?: string;
  parts_reserved?: boolean;
  check_in_at?: string;
  check_out_at?: string;
  scheduled_start?: string;
  scheduled_end?: string;
  sla_deadline?: string;
  created_at: string;
  ticket?: {
    symptom?: string;
    site_address?: string;
  };
  technician?: {
    full_name?: string;
  };
}

// Represents a single WO block on the timeline
interface TimelineBlock {
  woId: string;
  label: string;
  leftPct: number;
  widthPct: number;
  color: 'green' | 'amber' | 'red' | 'blue';
  tooltip: string;
}

interface TechRow {
  techId: string;
  techName: string;
  blocks: TimelineBlock[];
}

// Working day constants: 08:00 – 16:00 (8 hours)
const DAY_START_HOUR = 8;
const DAY_DURATION_HOURS = 8;

function timeToPercent(isoString: string): number {
  const d = new Date(isoString);
  const hours = d.getHours() + d.getMinutes() / 60;
  const clamped = Math.max(DAY_START_HOUR, Math.min(DAY_START_HOUR + DAY_DURATION_HOURS, hours));
  return ((clamped - DAY_START_HOUR) / DAY_DURATION_HOURS) * 100;
}

function woBlockColor(wo: DispatchWorkOrder): 'green' | 'amber' | 'red' | 'blue' {
  if (!wo.sla_deadline) return 'blue';
  const now = Date.now();
  const deadline = new Date(wo.sla_deadline).getTime();
  const remaining = deadline - now;
  if (remaining < 0) return 'red';
  if (remaining < 2 * 60 * 60 * 1000) return 'amber';
  return 'green';
}

function buildTimelineRows(workOrders: DispatchWorkOrder[]): TechRow[] {
  const byTech = new Map<string, DispatchWorkOrder[]>();
  for (const wo of workOrders) {
    const key = wo.technician_id ?? '__unassigned__';
    if (!byTech.has(key)) byTech.set(key, []);
    byTech.get(key)!.push(wo);
  }

  const rows: TechRow[] = [];
  byTech.forEach((wos, techId) => {
    const techName = wos[0]?.technician?.full_name ?? (techId === '__unassigned__' ? 'Unassigned' : techId.slice(0, 8));
    const blocks: TimelineBlock[] = [];

    for (const wo of wos) {
      if (!wo.scheduled_start) continue;
      const start = timeToPercent(wo.scheduled_start);
      const end = wo.scheduled_end ? timeToPercent(wo.scheduled_end) : Math.min(start + 12.5, 100);
      const width = Math.max(end - start, 5);
      blocks.push({
        woId: wo.id,
        label: wo.wo_number ?? 'WO',
        leftPct: start,
        widthPct: width,
        color: woBlockColor(wo),
        tooltip: `${wo.wo_number ?? 'WO'} — ${wo.ticket?.symptom ?? 'No description'}\n${wo.ticket?.site_address ?? ''}`,
      });
    }

    rows.push({ techId, techName, blocks });
  });

  return rows;
}

const HOUR_LABELS = Array.from({ length: DAY_DURATION_HOURS + 1 }, (_, i) => {
  const h = DAY_START_HOUR + i;
  return h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h - 12}pm`;
});

const BLOCK_COLORS: Record<string, string> = {
  green: 'bg-green-500 text-white',
  amber: 'bg-amber-400 text-white',
  red: 'bg-red-500 text-white',
  blue: 'bg-blue-500 text-white',
};


export default function Dispatch() {
  const { toast } = useToast();
  const { roles } = useRBAC();
  const dispatchPerms = useActionPermissions('dispatch');
  const [workOrders, setWorkOrders] = useState<DispatchWorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [geoDialogOpen, setGeoDialogOpen] = useState(false);
  const [selectedWOId, setSelectedWOId] = useState<string | null>(null);
  const [checkMode, setCheckMode] = useState<'check-in' | 'check-out'>('check-in');
  const [detailWOId, setDetailWOId] = useState<string | null>(null);

  // Check if user is view-only
  const isViewOnly = !dispatchPerms.create && !dispatchPerms.edit && !dispatchPerms.execute;

  useEffect(() => {
    fetchWorkOrders();
  }, []);

  const fetchWorkOrders = async () => {
    try {
      const { data, error } = await apiClient
        .from('work_orders')
        .select('*, ticket:tickets(*), technician:profiles(full_name)')
        .in('status', ['pending_validation', 'in_progress'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWorkOrders((data || []) as DispatchWorkOrder[]);
    } catch (error: unknown) {
      toast({
        title: "Error loading work orders",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (woId: string, newStatus: 'completed' | 'in_progress') => {
    try {
      const { error } = await apiClient
        .from('work_orders')
        .update({ status: newStatus })
        .eq('id', woId);

      if (error) throw error;

      toast({
        title: "Status updated",
        description: `Work order status changed to ${newStatus}`,
      });

      fetchWorkOrders();
    } catch (error: unknown) {
      toast({
        title: "Error updating status",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive",
      });
    }
  };

  const inProgress = workOrders.filter(wo => wo.status === 'in_progress').length;
  const pendingValidation = workOrders.filter(wo => wo.status === 'pending_validation').length;
  const partsReady = workOrders.filter(wo => wo.parts_reserved).length;
  const timelineRows = buildTimelineRows(workOrders);
  const detailWO = detailWOId ? workOrders.find(wo => wo.id === detailWOId) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dispatch</h1>
        <p className="text-muted-foreground">
          Real-time dispatch board for field operations
        </p>
      </div>

      {/* View-only alert for Operations Managers */}
      {isViewOnly && (
        <Alert className="bg-blue-50 border-blue-200">
          <EyeOff className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>View-Only Mode:</strong> You can view dispatch information but cannot perform actions on work orders.
            Your role ({roles.map(r => r.role).join(', ')}) has read-only access to this page.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <Truck className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inProgress}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Validation</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingValidation}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Parts Ready</CardTitle>
            <Package className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{partsReady}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active WOs</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{workOrders.length}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="board">
        <TabsList>
          <TabsTrigger value="board">
            <LayoutList className="h-4 w-4 mr-1.5" />
            Board View
          </TabsTrigger>
          <TabsTrigger value="timeline">
            <GanttChart className="h-4 w-4 mr-1.5" />
            Timeline View
          </TabsTrigger>
        </TabsList>

        {/* ── Board View (existing content) ─────────────────── */}
        <TabsContent value="board" className="mt-4">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>In Progress</CardTitle>
            <CardDescription>Work orders currently being worked on</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {workOrders.filter(wo => wo.status === 'in_progress').map((wo) => (
                <div
                  key={wo.id}
                  className="p-4 border rounded-lg bg-blue-50 border-blue-200"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-semibold">{wo.wo_number || 'Draft'}</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {wo.ticket?.symptom || 'No description'}
                      </p>
                    </div>
                    <Badge className="bg-blue-100 text-blue-800">In Progress</Badge>
                  </div>
                  <div className="space-y-2 mt-3 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {wo.ticket?.site_address || 'No address'}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Truck className="h-3 w-3" />
                      {wo.technician?.full_name || 'Unassigned'}
                    </div>
                    {wo.parts_reserved && (
                      <div className="flex items-center gap-2 text-green-600">
                        <Package className="h-3 w-3" />
                        Parts Reserved
                      </div>
                    )}
                  </div>
                  {wo.check_in_at && (
                    <div className="mt-2 text-xs text-green-600 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Checked in at {new Date(wo.check_in_at).toLocaleTimeString()}
                    </div>
                  )}
                  <div className="mt-3 flex gap-2">
                    {!wo.check_in_at && dispatchPerms.execute && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedWOId(wo.id);
                          setCheckMode('check-in');
                          setGeoDialogOpen(true);
                        }}
                      >
                        <Navigation className="mr-1 h-3 w-3" />
                        Check In
                      </Button>
                    )}
                    {wo.check_in_at && !wo.check_out_at && dispatchPerms.execute && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedWOId(wo.id);
                          setCheckMode('check-out');
                          setGeoDialogOpen(true);
                        }}
                      >
                        <Navigation className="mr-1 h-3 w-3" />
                        Check Out
                      </Button>
                    )}
                    {dispatchPerms.edit && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateStatus(wo.id, 'completed')}
                        disabled={!wo.check_in_at}
                      >
                        Mark Complete
                      </Button>
                    )}
                    {isViewOnly && (
                      <Badge variant="outline" className="text-xs">
                        View Only
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
              {workOrders.filter(wo => wo.status === 'in_progress').length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No work orders in progress
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pending Validation</CardTitle>
            <CardDescription>Awaiting precheck validation</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {workOrders.filter(wo => wo.status === 'pending_validation').map((wo) => (
                <div
                  key={wo.id}
                  className="p-4 border rounded-lg bg-orange-50 border-orange-200"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-semibold">{wo.wo_number || 'Draft'}</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {wo.ticket?.symptom || 'No description'}
                      </p>
                    </div>
                    <Badge className="bg-orange-100 text-orange-800">Pending</Badge>
                  </div>
                  <div className="space-y-2 mt-3 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      Waiting for validation
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Truck className="h-3 w-3" />
                      {wo.technician?.full_name || 'Unassigned'}
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    {dispatchPerms.execute && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateStatus(wo.id, 'in_progress')}
                      >
                        Release to Field
                      </Button>
                    )}
                    {isViewOnly && (
                      <Badge variant="outline" className="text-xs">
                        View Only
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
              {workOrders.filter(wo => wo.status === 'pending_validation').length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No pending validations
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

        </TabsContent>

        {/* ── Timeline View ─────────────────────────────────── */}
        <TabsContent value="timeline" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Technician Timeline</CardTitle>
              <CardDescription>
                8-hour working day (8 am – 4 pm).{' '}
                <span className="inline-flex items-center gap-3 ml-1 text-xs">
                  <span className="inline-block w-3 h-3 rounded bg-green-500" /> On-time
                  <span className="inline-block w-3 h-3 rounded bg-amber-400" /> At risk
                  <span className="inline-block w-3 h-3 rounded bg-red-500" /> SLA breach
                  <span className="inline-block w-3 h-3 rounded bg-blue-500" /> No SLA
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {loading ? (
                <p className="text-center py-8 text-muted-foreground">Loading…</p>
              ) : timelineRows.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No scheduled work orders to display.</p>
              ) : (
                <div className="min-w-[600px]">
                  {/* Hour labels */}
                  <div className="flex mb-1 pl-36">
                    {HOUR_LABELS.map((label) => (
                      <div
                        key={label}
                        className="flex-1 text-xs text-muted-foreground text-left border-l border-border pl-1"
                      >
                        {label}
                      </div>
                    ))}
                  </div>

                  {/* Technician rows */}
                  <div className="space-y-1">
                    {timelineRows.map((row) => (
                      <div key={row.techId} className="flex items-center gap-2 group">
                        <div className="w-32 shrink-0 text-sm truncate text-right pr-2 text-muted-foreground font-medium">
                          {row.techName}
                        </div>
                        <div className="flex-1 relative h-8 bg-muted/40 rounded border border-border">
                          {/* Grid lines */}
                          {HOUR_LABELS.slice(1, -1).map((_, i) => (
                            <div
                              key={i}
                              className="absolute top-0 bottom-0 border-l border-border/50"
                              style={{ left: `${((i + 1) / DAY_DURATION_HOURS) * 100}%` }}
                            />
                          ))}
                          {/* WO blocks */}
                          {row.blocks.length === 0 ? (
                            <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground/50 italic">
                              no scheduled WOs
                            </div>
                          ) : (
                            row.blocks.map((block) => (
                              <button
                                key={block.woId}
                                title={block.tooltip}
                                onClick={() => setDetailWOId(block.woId)}
                                className={`absolute top-0.5 bottom-0.5 rounded text-xs font-semibold truncate px-1 cursor-pointer transition-opacity hover:opacity-80 ${BLOCK_COLORS[block.color]}`}
                                style={{
                                  left: `${block.leftPct}%`,
                                  width: `${block.widthPct}%`,
                                }}
                              >
                                {block.label}
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* WO detail panel */}
              {detailWO && (
                <div className="mt-4 p-4 border rounded-lg bg-muted/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">{detailWO.wo_number ?? 'Draft'}</h4>
                    <Button variant="ghost" size="sm" onClick={() => setDetailWOId(null)}>
                      Close
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">{detailWO.ticket?.symptom ?? 'No description'}</p>
                  <div className="flex flex-wrap gap-3 text-sm">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" />
                      {detailWO.ticket?.site_address ?? 'No address'}
                    </span>
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Truck className="h-3.5 w-3.5" />
                      {detailWO.technician?.full_name ?? 'Unassigned'}
                    </span>
                    <Badge>{detailWO.status}</Badge>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {selectedWOId && (
        <GeoCheckInDialog
          open={geoDialogOpen}
          onOpenChange={setGeoDialogOpen}
          workOrderId={selectedWOId}
          mode={checkMode}
          onSuccess={fetchWorkOrders}
        />
      )}
    </div>
  );
}