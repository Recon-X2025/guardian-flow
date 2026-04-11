import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { MapPin, Plus, Pencil, Trash2, Users, Layers, BarChart2 } from 'lucide-react';
import { apiClient } from '@/integrations/api/client';
import { useToast } from '@/domains/shared/hooks/use-toast';

interface Territory {
  id: string;
  name: string;
  polygon: object | null;
  technician_ids: string[];
  created_at?: string;
  updated_at?: string;
}

interface TerritoryWithStats extends Territory {
  woCount: number;
}

const DEFAULT_POLYGON = JSON.stringify(
  {
    type: 'Polygon',
    coordinates: [
      [
        [-73.99, 40.71],
        [-73.98, 40.71],
        [-73.98, 40.72],
        [-73.99, 40.72],
        [-73.99, 40.71],
      ],
    ],
  },
  null,
  2
);

function polygonSummary(polygon: object | null): string {
  if (!polygon) return 'No polygon defined';
  try {
    const p = polygon as { coordinates?: number[][][] };
    const coords = p.coordinates?.[0];
    if (!coords || coords.length < 2) return 'Invalid polygon';
    const lngs = coords.map((c) => c[0]);
    const lats = coords.map((c) => c[1]);
    const minLng = Math.min(...lngs).toFixed(4);
    const maxLng = Math.max(...lngs).toFixed(4);
    const minLat = Math.min(...lats).toFixed(4);
    const maxLat = Math.max(...lats).toFixed(4);
    return `Lat ${minLat}–${maxLat}, Lng ${minLng}–${maxLng}`;
  } catch {
    return 'Invalid polygon';
  }
}

interface TerritoryFormState {
  name: string;
  polygonJson: string;
  technicianIds: string;
}

const EMPTY_FORM: TerritoryFormState = {
  name: '',
  polygonJson: DEFAULT_POLYGON,
  technicianIds: '',
};

export default function TerritoryManagement() {
  const { toast } = useToast();
  const [territories, setTerritories] = useState<TerritoryWithStats[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TerritoryFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchTerritories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.request<Territory[]>('/api/territories', { method: 'GET' });
      if (res.error) throw new Error(res.error.message);
      const list: Territory[] = res.data ?? [];

      const withStats: TerritoryWithStats[] = await Promise.all(
        list.map(async (t) => {
          const woRes = await apiClient.request<{ count?: number; data?: unknown[] }>(
            `/api/territories/${t.id}/work-orders`,
            { method: 'GET' }
          );
          const woCount =
            woRes.data?.count ??
            (Array.isArray(woRes.data) ? (woRes.data as unknown[]).length : (woRes.data?.data?.length ?? 0));
          return { ...t, woCount };
        })
      );
      setTerritories(withStats);
    } catch (err: unknown) {
      toast({
        title: 'Error loading territories',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchTerritories();
  }, [fetchTerritories]);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (t: TerritoryWithStats) => {
    setEditingId(t.id);
    setForm({
      name: t.name,
      polygonJson: t.polygon ? JSON.stringify(t.polygon, null, 2) : DEFAULT_POLYGON,
      technicianIds: (t.technician_ids ?? []).join(', '),
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ title: 'Name is required', variant: 'destructive' });
      return;
    }

    let polygon: object | null = null;
    try {
      polygon = JSON.parse(form.polygonJson);
    } catch {
      toast({ title: 'Invalid JSON polygon', variant: 'destructive' });
      return;
    }

    const technicianIds = form.technicianIds
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const body = { name: form.name.trim(), polygon, technician_ids: technicianIds };

    setSaving(true);
    try {
      if (editingId) {
        const res = await apiClient.request(`/api/territories/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(body),
        });
        if (res.error) throw new Error(res.error.message);
        toast({ title: 'Territory updated' });
      } else {
        const res = await apiClient.request('/api/territories', {
          method: 'POST',
          body: JSON.stringify(body),
        });
        if (res.error) throw new Error(res.error.message);
        toast({ title: 'Territory created' });
      }
      setModalOpen(false);
      fetchTerritories();
    } catch (err: unknown) {
      toast({
        title: 'Save failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await apiClient.request(`/api/territories/${deleteId}`, { method: 'DELETE' });
      if (res.error) throw new Error(res.error.message);
      toast({ title: 'Territory deleted' });
      fetchTerritories();
    } catch (err: unknown) {
      toast({
        title: 'Delete failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Territory Management</h1>
          <p className="text-muted-foreground">Define service territories and assign technicians</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Create Territory
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Territories</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{territories.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Technicians Assigned</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {territories.reduce((sum, t) => sum + (t.technician_ids?.length ?? 0), 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total WO Density</CardTitle>
            <BarChart2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {territories.reduce((sum, t) => sum + (t.woCount ?? 0), 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Territory cards */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading territories…</div>
      ) : territories.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
            <MapPin className="h-12 w-12 text-muted-foreground/40" />
            <p className="text-muted-foreground">No territories defined yet.</p>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Create your first territory
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {territories.map((t) => (
            <Card key={t.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">{t.name}</CardTitle>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => openEdit(t)}
                      aria-label={`Edit ${t.name}`}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => setDeleteId(t.id)}
                      aria-label={`Delete ${t.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <CardDescription className="text-xs truncate">
                  <MapPin className="inline h-3 w-3 mr-1" />
                  {polygonSummary(t.polygon)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    <span>{t.technician_ids?.length ?? 0} technician{(t.technician_ids?.length ?? 0) !== 1 ? 's' : ''}</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    <BarChart2 className="h-3 w-3 mr-1" />
                    {t.woCount} WOs
                  </Badge>
                </div>
                {(t.technician_ids?.length ?? 0) > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {t.technician_ids.slice(0, 3).map((id) => (
                      <Badge key={id} variant="secondary" className="text-xs font-mono">
                        {id.slice(0, 8)}…
                      </Badge>
                    ))}
                    {t.technician_ids.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{t.technician_ids.length - 3} more
                      </Badge>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Territory' : 'Create Territory'}</DialogTitle>
            <DialogDescription>
              {editingId
                ? 'Update the territory name, boundary polygon, or assigned technicians.'
                : 'Define a new service territory with a GeoJSON polygon boundary.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="territory-name">Name</Label>
              <Input
                id="territory-name"
                placeholder="e.g. North District"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="territory-polygon">
                Polygon (GeoJSON)
                <span className="ml-1 text-xs text-muted-foreground">— Polygon geometry object</span>
              </Label>
              <Textarea
                id="territory-polygon"
                className="font-mono text-xs h-44 resize-none"
                value={form.polygonJson}
                onChange={(e) => setForm((f) => ({ ...f, polygonJson: e.target.value }))}
                spellCheck={false}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="territory-techs">
                Technician IDs
                <span className="ml-1 text-xs text-muted-foreground">— comma-separated</span>
              </Label>
              <Input
                id="territory-techs"
                placeholder="uuid-1, uuid-2, …"
                value={form.technicianIds}
                onChange={(e) => setForm((f) => ({ ...f, technicianIds: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete territory?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The territory and its associations will be permanently
              removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
