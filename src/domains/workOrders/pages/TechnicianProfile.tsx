import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/domains/shared/hooks/use-toast';
import { apiClient } from '@/integrations/api/client';
import { useParams } from 'react-router-dom';
import { User, Plus, Trash2, Upload, ClipboardList } from 'lucide-react';

interface TechSkill {
  id: string;
  skill_id: string;
  certification_id: string | null;
  expiry_date: string | null;
  expiry_status: 'valid' | 'expired' | 'no_expiry';
  assigned_at: string;
}

interface Skill {
  id: string;
  name: string;
  category: string | null;
}

interface Certification {
  id: string;
  name: string;
  validity_period_days: number | null;
}

export default function TechnicianProfile() {
  const { techId } = useParams<{ techId: string }>();
  const { toast } = useToast();

  const [techSkills, setTechSkills] = useState<TechSkill[]>([]);
  const [allSkills, setAllSkills] = useState<Skill[]>([]);
  const [allCerts, setAllCerts] = useState<Certification[]>([]);
  const [loading, setLoading] = useState(true);

  const [addSkillOpen, setAddSkillOpen] = useState(false);
  const [newSkillId, setNewSkillId] = useState('');
  const [newCertId, setNewCertId] = useState('');
  const [newExpiry, setNewExpiry] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    if (!techId) return;
    setLoading(true);
    try {
      const [skillsRes, certsRes, techSkillsRes] = await Promise.all([
        apiClient.get('/api/skills'),
        apiClient.get('/api/skills/certifications'),
        apiClient.get(`/api/skills/technicians/${techId}`),
      ]);
      setAllSkills(skillsRes.data?.skills ?? []);
      setAllCerts(certsRes.data?.certifications ?? []);
      setTechSkills(techSkillsRes.data?.techSkills ?? []);
    } catch {
      toast({ title: 'Error', description: 'Failed to load data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [techId, toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAddSkill = async () => {
    if (!newSkillId || !techId) return;
    setSaving(true);
    try {
      await apiClient.post(`/api/skills/technicians/${techId}/skills`, {
        skillId: newSkillId,
        certificationId: newCertId || undefined,
        expiryDate: newExpiry || undefined,
      });
      toast({ title: 'Skill assigned' });
      setAddSkillOpen(false);
      setNewSkillId('');
      setNewCertId('');
      setNewExpiry('');
      fetchData();
    } catch {
      toast({ title: 'Error', description: 'Failed to assign skill', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const skillName = (id: string) => allSkills.find(s => s.id === id)?.name ?? id;
  const certName = (id: string | null) => id ? (allCerts.find(c => c.id === id)?.name ?? id) : '—';

  const expiryBadge = (status: TechSkill['expiry_status'], date: string | null) => {
    if (status === 'no_expiry') return <Badge variant="secondary">No expiry</Badge>;
    if (status === 'valid') return <Badge className="bg-green-600 text-white">{date ? new Date(date).toLocaleDateString() : 'Valid'}</Badge>;
    return <Badge variant="destructive">{date ? new Date(date).toLocaleDateString() : 'Expired'}</Badge>;
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Profile header */}
      <Card>
        <CardContent className="flex items-center gap-5 pt-6">
          <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center">
            <User className="h-10 w-10 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Technician Profile</h1>
            <p className="text-muted-foreground">ID: {techId}</p>
            <Badge className="mt-1">Technician</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="skills">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="skills">Skills &amp; Certifications</TabsTrigger>
          <TabsTrigger value="history">Work History</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader><CardTitle>Overview</CardTitle></CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Technician details and summary will appear here.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="skills">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Skills &amp; Certifications</CardTitle>
              <div className="flex gap-2">
                {/* Certification upload placeholder */}
                <Button variant="outline" size="sm" disabled>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Certificate
                </Button>
                <Dialog open={addSkillOpen} onOpenChange={setAddSkillOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm"><Plus className="h-4 w-4 mr-2" />Add Skill</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Assign Skill</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-2">
                      <div>
                        <Label>Skill</Label>
                        <select
                          className="w-full border rounded px-3 py-2 text-sm mt-1"
                          value={newSkillId}
                          onChange={e => setNewSkillId(e.target.value)}
                        >
                          <option value="">Select skill…</option>
                          {allSkills.map(s => (
                            <option key={s.id} value={s.id}>{s.name}{s.category ? ` (${s.category})` : ''}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <Label>Certification (optional)</Label>
                        <select
                          className="w-full border rounded px-3 py-2 text-sm mt-1"
                          value={newCertId}
                          onChange={e => setNewCertId(e.target.value)}
                        >
                          <option value="">None</option>
                          {allCerts.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <Label>Expiry Date (optional)</Label>
                        <Input type="date" value={newExpiry} onChange={e => setNewExpiry(e.target.value)} className="mt-1" />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setAddSkillOpen(false)}>Cancel</Button>
                      <Button onClick={handleAddSkill} disabled={saving || !newSkillId}>
                        {saving ? 'Saving…' : 'Assign'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-muted-foreground text-sm">Loading…</p>
              ) : techSkills.length === 0 ? (
                <p className="text-muted-foreground text-sm">No skills assigned yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Skill</TableHead>
                      <TableHead>Certification</TableHead>
                      <TableHead>Expiry</TableHead>
                      <TableHead>Assigned</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {techSkills.map(ts => (
                      <TableRow key={ts.id}>
                        <TableCell className="font-medium">{skillName(ts.skill_id)}</TableCell>
                        <TableCell>{certName(ts.certification_id)}</TableCell>
                        <TableCell>{expiryBadge(ts.expiry_status, ts.expiry_date)}</TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {new Date(ts.assigned_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                Work History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">Work order history will appear here.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
