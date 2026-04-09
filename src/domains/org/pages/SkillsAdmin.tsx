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
import { Plus, Pencil, Trash2, Award, BookOpen } from 'lucide-react';

interface Skill {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
}

interface Certification {
  id: string;
  name: string;
  validity_period_days: number | null;
  required_by_regulations: boolean;
  description: string | null;
}

type DialogMode = 'create' | 'edit';

export default function SkillsAdmin() {
  const { toast } = useToast();

  const [skills, setSkills] = useState<Skill[]>([]);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [loading, setLoading] = useState(true);

  // Skill dialog state
  const [skillDialogOpen, setSkillDialogOpen] = useState(false);
  const [skillMode, setSkillMode] = useState<DialogMode>('create');
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [skillName, setSkillName] = useState('');
  const [skillCategory, setSkillCategory] = useState('');
  const [skillDescription, setSkillDescription] = useState('');
  const [skillSaving, setSkillSaving] = useState(false);

  // Certification dialog state
  const [certDialogOpen, setCertDialogOpen] = useState(false);
  const [certMode, setCertMode] = useState<DialogMode>('create');
  const [editingCert, setEditingCert] = useState<Certification | null>(null);
  const [certName, setCertName] = useState('');
  const [certValidity, setCertValidity] = useState('');
  const [certRegulations, setCertRegulations] = useState(false);
  const [certDescription, setCertDescription] = useState('');
  const [certSaving, setCertSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [skillsRes, certsRes] = await Promise.all([
        apiClient.get('/api/skills'),
        apiClient.get('/api/skills/certifications'),
      ]);
      setSkills(skillsRes.data?.skills ?? []);
      setCertifications(certsRes.data?.certifications ?? []);
    } catch {
      toast({ title: 'Error', description: 'Failed to load catalog', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Skill handlers ──────────────────────────────────────────────────────────

  const openCreateSkill = () => {
    setSkillMode('create');
    setEditingSkill(null);
    setSkillName('');
    setSkillCategory('');
    setSkillDescription('');
    setSkillDialogOpen(true);
  };

  const openEditSkill = (skill: Skill) => {
    setSkillMode('edit');
    setEditingSkill(skill);
    setSkillName(skill.name);
    setSkillCategory(skill.category ?? '');
    setSkillDescription(skill.description ?? '');
    setSkillDialogOpen(true);
  };

  const handleSaveSkill = async () => {
    if (!skillName.trim()) return;
    setSkillSaving(true);
    try {
      const payload = {
        name: skillName.trim(),
        category: skillCategory.trim() || undefined,
        description: skillDescription.trim() || undefined,
      };
      if (skillMode === 'create') {
        await apiClient.post('/api/skills', payload);
        toast({ title: 'Skill created' });
      } else {
        await apiClient.put(`/api/skills/${editingSkill!.id}`, payload);
        toast({ title: 'Skill updated' });
      }
      setSkillDialogOpen(false);
      fetchData();
    } catch {
      toast({ title: 'Error', description: 'Failed to save skill', variant: 'destructive' });
    } finally {
      setSkillSaving(false);
    }
  };

  const handleDeleteSkill = async (id: string) => {
    try {
      await apiClient.delete(`/api/skills/${id}`);
      toast({ title: 'Skill deleted' });
      fetchData();
    } catch {
      toast({ title: 'Error', description: 'Failed to delete skill', variant: 'destructive' });
    }
  };

  // ── Certification handlers ──────────────────────────────────────────────────

  const openCreateCert = () => {
    setCertMode('create');
    setEditingCert(null);
    setCertName('');
    setCertValidity('');
    setCertRegulations(false);
    setCertDescription('');
    setCertDialogOpen(true);
  };

  const openEditCert = (cert: Certification) => {
    setCertMode('edit');
    setEditingCert(cert);
    setCertName(cert.name);
    setCertValidity(cert.validity_period_days !== null ? String(cert.validity_period_days) : '');
    setCertRegulations(cert.required_by_regulations);
    setCertDescription(cert.description ?? '');
    setCertDialogOpen(true);
  };

  const handleSaveCert = async () => {
    if (!certName.trim()) return;
    setCertSaving(true);
    try {
      const payload = {
        name: certName.trim(),
        validity_period_days: certValidity ? Number(certValidity) : undefined,
        required_by_regulations: certRegulations,
        description: certDescription.trim() || undefined,
      };
      if (certMode === 'create') {
        await apiClient.post('/api/skills/certifications', payload);
        toast({ title: 'Certification created' });
      } else {
        await apiClient.put(`/api/skills/certifications/${editingCert!.id}`, payload);
        toast({ title: 'Certification updated' });
      }
      setCertDialogOpen(false);
      fetchData();
    } catch {
      toast({ title: 'Error', description: 'Failed to save certification', variant: 'destructive' });
    } finally {
      setCertSaving(false);
    }
  };

  const handleDeleteCert = async (id: string) => {
    try {
      await apiClient.delete(`/api/skills/certifications/${id}`);
      toast({ title: 'Certification deleted' });
      fetchData();
    } catch {
      toast({ title: 'Error', description: 'Failed to delete certification', variant: 'destructive' });
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Skills &amp; Certifications Admin</h1>
        <p className="text-muted-foreground mt-1">Manage the organization's skills and certification catalog.</p>
      </div>

      <Tabs defaultValue="skills">
        <TabsList>
          <TabsTrigger value="skills" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />Skills
          </TabsTrigger>
          <TabsTrigger value="certifications" className="flex items-center gap-2">
            <Award className="h-4 w-4" />Certifications
          </TabsTrigger>
        </TabsList>

        {/* Skills Tab */}
        <TabsContent value="skills">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Skills Catalog</CardTitle>
              <Button size="sm" onClick={openCreateSkill}>
                <Plus className="h-4 w-4 mr-2" />New Skill
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-muted-foreground text-sm">Loading…</p>
              ) : skills.length === 0 ? (
                <p className="text-muted-foreground text-sm">No skills defined yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="w-20" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {skills.map(skill => (
                      <TableRow key={skill.id}>
                        <TableCell className="font-medium">{skill.name}</TableCell>
                        <TableCell>
                          {skill.category ? <Badge variant="outline">{skill.category}</Badge> : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">{skill.description ?? '—'}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEditSkill(skill)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteSkill(skill.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Certifications Tab */}
        <TabsContent value="certifications">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Certifications Catalog</CardTitle>
              <Button size="sm" onClick={openCreateCert}>
                <Plus className="h-4 w-4 mr-2" />New Certification
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-muted-foreground text-sm">Loading…</p>
              ) : certifications.length === 0 ? (
                <p className="text-muted-foreground text-sm">No certifications defined yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Validity Period</TableHead>
                      <TableHead>Regulatory</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="w-20" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {certifications.map(cert => (
                      <TableRow key={cert.id}>
                        <TableCell className="font-medium">{cert.name}</TableCell>
                        <TableCell>
                          {cert.validity_period_days !== null
                            ? `${cert.validity_period_days} days`
                            : <span className="text-muted-foreground">Permanent</span>}
                        </TableCell>
                        <TableCell>
                          {cert.required_by_regulations
                            ? <Badge className="bg-amber-500 text-white">Required</Badge>
                            : <Badge variant="secondary">Optional</Badge>}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">{cert.description ?? '—'}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openEditCert(cert)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteCert(cert.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Skill Dialog */}
      <Dialog open={skillDialogOpen} onOpenChange={setSkillDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{skillMode === 'create' ? 'New Skill' : 'Edit Skill'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Name *</Label>
              <Input value={skillName} onChange={e => setSkillName(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Category</Label>
              <Input value={skillCategory} onChange={e => setSkillCategory(e.target.value)} className="mt-1" placeholder="e.g. Electrical, HVAC" />
            </div>
            <div>
              <Label>Description</Label>
              <Input value={skillDescription} onChange={e => setSkillDescription(e.target.value)} className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSkillDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveSkill} disabled={skillSaving || !skillName.trim()}>
              {skillSaving ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Certification Dialog */}
      <Dialog open={certDialogOpen} onOpenChange={setCertDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{certMode === 'create' ? 'New Certification' : 'Edit Certification'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Name *</Label>
              <Input value={certName} onChange={e => setCertName(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Validity Period (days)</Label>
              <Input type="number" value={certValidity} onChange={e => setCertValidity(e.target.value)} className="mt-1" placeholder="Leave blank for permanent" />
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="cert-regulations"
                checked={certRegulations}
                onChange={e => setCertRegulations(e.target.checked)}
                className="h-4 w-4"
              />
              <Label htmlFor="cert-regulations">Required by regulations</Label>
            </div>
            <div>
              <Label>Description</Label>
              <Input value={certDescription} onChange={e => setCertDescription(e.target.value)} className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCertDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveCert} disabled={certSaving || !certName.trim()}>
              {certSaving ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
