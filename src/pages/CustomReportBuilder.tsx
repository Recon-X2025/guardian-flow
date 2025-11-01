import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Plus, Play, Download, Calendar, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function CustomReportBuilder() {
  const queryClient = useQueryClient();
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [reportResults, setReportResults] = useState<any[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const { data: reports, isLoading } = useQuery({
    queryKey: ['custom-reports'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('custom-report-builder', {
        body: { action: 'list' },
      });
      if (error) throw error;
      return data.reports || [];
    },
  });

  const createReportMutation = useMutation({
    mutationFn: async (reportData: any) => {
      const { data, error } = await supabase.functions.invoke('custom-report-builder', {
        body: { action: 'create', data: reportData },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-reports'] });
      toast.success('Report created successfully');
      setIsCreateDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create report');
    },
  });

  const executeReportMutation = useMutation({
    mutationFn: async (reportId: string) => {
      const { data, error } = await supabase.functions.invoke('custom-report-builder', {
        body: { action: 'execute', report_id: reportId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setReportResults(data.results || []);
      toast.success('Report executed successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to execute report');
    },
  });

  const deleteReportMutation = useMutation({
    mutationFn: async (reportId: string) => {
      const { error } = await supabase.functions.invoke('custom-report-builder', {
        body: { action: 'delete', report_id: reportId },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-reports'] });
      toast.success('Report deleted successfully');
      setSelectedReport(null);
      setReportResults([]);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete report');
    },
  });

  const handleCreateReport = (formData: any) => {
    createReportMutation.mutate({
      name: formData.get('name'),
      description: formData.get('description'),
      report_type: formData.get('report_type'),
      data_sources: {
        primary_table: formData.get('primary_table'),
      },
      columns: JSON.parse(formData.get('columns') || '[]'),
      filters: [],
      visualizations: {},
    });
  };

  const handleExecuteReport = (reportId: string) => {
    executeReportMutation.mutate(reportId);
  };

  const handleExportReport = async (reportId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('custom-report-builder', {
        body: { action: 'export', report_id: reportId, format: 'csv' },
      });
      if (error) throw error;

      const blob = new Blob([data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${reportId}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast.success('Report exported successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to export report');
    }
  };

  if (isLoading) {
    return <div className="p-8">Loading reports...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Custom Report Builder</h1>
          <p className="text-muted-foreground">Create and execute custom reports</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Report
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Custom Report</DialogTitle>
              <DialogDescription>
                Define your report structure and data sources
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              handleCreateReport(new FormData(e.currentTarget));
            }} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Report Name</Label>
                <Input id="name" name="name" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" name="description" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="report_type">Report Type</Label>
                <Select name="report_type" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="table">Table</SelectItem>
                    <SelectItem value="chart">Chart</SelectItem>
                    <SelectItem value="dashboard">Dashboard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="primary_table">Primary Data Source</Label>
                <Select name="primary_table" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select table" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="work_orders">Work Orders</SelectItem>
                    <SelectItem value="equipment">Equipment</SelectItem>
                    <SelectItem value="customers">Customers</SelectItem>
                    <SelectItem value="technicians">Technicians</SelectItem>
                    <SelectItem value="invoices">Invoices</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="columns">Columns (JSON)</Label>
                <Textarea 
                  id="columns" 
                  name="columns"
                  placeholder='[{"field": "id", "label": "ID"}, {"field": "status", "label": "Status"}]'
                  required
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Create Report</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>My Reports</CardTitle>
            <CardDescription>Select a report to execute</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {reports?.map((report: any) => (
              <div
                key={report.id}
                className={`p-3 rounded-lg border cursor-pointer hover:bg-accent ${
                  selectedReport?.id === report.id ? 'bg-accent' : ''
                }`}
                onClick={() => setSelectedReport(report)}
              >
                <div className="font-medium">{report.name}</div>
                <div className="text-sm text-muted-foreground">{report.report_type}</div>
              </div>
            ))}
            {(!reports || reports.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No reports yet. Create your first report!
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Report Details</CardTitle>
            {selectedReport && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleExecuteReport(selectedReport.id)}
                  disabled={executeReportMutation.isPending}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Execute
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleExportReport(selectedReport.id)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => deleteReportMutation.mutate(selectedReport.id)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {selectedReport ? (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold">{selectedReport.name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedReport.description}</p>
                </div>

                {reportResults.length > 0 && (
                  <div className="border rounded-lg overflow-auto max-h-96">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {Object.keys(reportResults[0]).map((key) => (
                            <TableHead key={key}>{key}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportResults.map((row, idx) => (
                          <TableRow key={idx}>
                            {Object.values(row).map((value: any, cellIdx) => (
                              <TableCell key={cellIdx}>{String(value)}</TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Select a report to view details and execute
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
