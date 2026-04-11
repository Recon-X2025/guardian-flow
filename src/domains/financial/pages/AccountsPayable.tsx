import { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, XCircle, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { apiClient } from '@/integrations/api/client';
import { toast } from '@/components/ui/sonner';

// ── Types ─────────────────────────────────────────────────────────────────────

type InvoiceStatus = 'pending' | 'matched' | 'approved' | 'paid' | 'rejected';

interface SupplierInvoice {
  id: string;
  invoice_number: string;
  supplier: string;
  amount: number;
  currency: string;
  due_date: string;
  status: InvoiceStatus;
  purchase_order?: string;
  receipt_ref?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive'; icon: React.ReactNode }> = {
  pending:  { label: 'Pending',  variant: 'secondary',   icon: <Clock className="h-3 w-3" /> },
  matched:  { label: 'Matched',  variant: 'outline',     icon: <CheckCircle2 className="h-3 w-3" /> },
  approved: { label: 'Approved', variant: 'default',     icon: <CheckCircle2 className="h-3 w-3" /> },
  paid:     { label: 'Paid',     variant: 'default',     icon: <CheckCircle2 className="h-3 w-3" /> },
  rejected: { label: 'Rejected', variant: 'destructive', icon: <XCircle className="h-3 w-3" /> },
};

function fmt(n: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(n);
}

// ── Supplier Invoices tab ─────────────────────────────────────────────────────

function SupplierInvoicesTab({ invoices }: { invoices: SupplierInvoice[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Invoice #</TableHead>
          <TableHead>Supplier</TableHead>
          <TableHead className="text-right">Amount</TableHead>
          <TableHead>Due Date</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {invoices.map(inv => {
          const cfg = STATUS_CONFIG[inv.status];
          return (
            <TableRow key={inv.id}>
              <TableCell className="font-mono text-sm">{inv.invoice_number}</TableCell>
              <TableCell>{inv.supplier}</TableCell>
              <TableCell className="text-right tabular-nums">{fmt(inv.amount, inv.currency)}</TableCell>
              <TableCell className="text-sm">{new Date(inv.due_date).toLocaleDateString()}</TableCell>
              <TableCell>
                <Badge variant={cfg.variant} className="gap-1">
                  {cfg.icon}
                  {cfg.label}
                </Badge>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

// ── 3-Way Match tab ───────────────────────────────────────────────────────────

function ThreeWayMatchTab({ invoices }: { invoices: SupplierInvoice[] }) {
  const matchable = invoices.filter(i => i.status !== 'pending');
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Invoice #</TableHead>
          <TableHead>Supplier</TableHead>
          <TableHead>PO Reference</TableHead>
          <TableHead>Receipt Ref</TableHead>
          <TableHead>Match Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {matchable.length === 0 && (
          <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No matched invoices</TableCell></TableRow>
        )}
        {matchable.map(inv => {
          const isFullyMatched = !!(inv.purchase_order && inv.receipt_ref);
          return (
            <TableRow key={inv.id}>
              <TableCell className="font-mono text-sm">{inv.invoice_number}</TableCell>
              <TableCell>{inv.supplier}</TableCell>
              <TableCell className="text-sm font-mono">{inv.purchase_order ?? <span className="text-muted-foreground">—</span>}</TableCell>
              <TableCell className="text-sm font-mono">{inv.receipt_ref ?? <span className="text-muted-foreground">—</span>}</TableCell>
              <TableCell>
                {isFullyMatched
                  ? <Badge variant="default" className="gap-1"><CheckCircle2 className="h-3 w-3" /> 3-Way Match</Badge>
                  : <Badge variant="secondary" className="gap-1"><AlertCircle className="h-3 w-3" /> Partial</Badge>
                }
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

// ── Approval Queue tab ────────────────────────────────────────────────────────

function ApprovalQueueTab({ invoices, onApprove, onReject }: {
  invoices: SupplierInvoice[];
  onApprove: (id: string) => void;
  onReject:  (id: string) => void;
}) {
  const queue = invoices.filter(i => i.status === 'matched' || i.status === 'pending');
  return (
    <div className="space-y-4">
      {queue.length === 0 && (
        <p className="text-center text-muted-foreground py-8">No invoices awaiting approval</p>
      )}
      {queue.map(inv => (
        <Card key={inv.id}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              <span>{inv.invoice_number} — {inv.supplier}</span>
              <Badge variant={STATUS_CONFIG[inv.status].variant}>{STATUS_CONFIG[inv.status].label}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground space-y-1">
              <div>Amount: <span className="font-medium text-foreground">{fmt(inv.amount, inv.currency)}</span></div>
              <div>Due: <span className="font-medium text-foreground">{new Date(inv.due_date).toLocaleDateString()}</span></div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="text-destructive border-destructive hover:bg-destructive/10" onClick={() => onReject(inv.id)}>
                <XCircle className="h-4 w-4 mr-1" /> Reject
              </Button>
              <Button size="sm" onClick={() => onApprove(inv.id)}>
                <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AccountsPayable() {
  const [invoices, setInvoices] = useState<SupplierInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        const { data, error } = await apiClient
          .from('supplier_invoices')
          .select('*')
          .order('due_date', { ascending: true })
          .then();
        if (error) throw new Error(String(error));
        setInvoices((data as SupplierInvoice[]) ?? []);
      } catch (err) {
        console.error('Failed to load supplier invoices:', err);
        toast.error('Could not load supplier invoices');
      } finally {
        setLoading(false);
      }
    };
    fetchInvoices();
  }, []);

  const handleApprove = async (id: string) => {
    try {
      await apiClient.from('supplier_invoices').update({ status: 'approved' }).eq('id', id);
      setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, status: 'approved' } : inv));
      toast.success('Invoice approved');
    } catch {
      toast.error('Failed to approve invoice');
    }
  };

  const handleReject = async (id: string) => {
    try {
      await apiClient.from('supplier_invoices').update({ status: 'rejected' }).eq('id', id);
      setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, status: 'rejected' } : inv));
      toast.success('Invoice rejected');
    } catch {
      toast.error('Failed to reject invoice');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Accounts Payable</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage supplier invoices, 3-way matching, and approval workflows.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading invoices…
        </div>
      ) : (
        <Tabs defaultValue="invoices">
          <TabsList>
            <TabsTrigger value="invoices">Supplier Invoices</TabsTrigger>
            <TabsTrigger value="match">3-Way Match</TabsTrigger>
            <TabsTrigger value="approval">Approval Queue</TabsTrigger>
          </TabsList>

          <TabsContent value="invoices" className="mt-4">
            {invoices.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">No supplier invoices found.</p>
            ) : (
              <SupplierInvoicesTab invoices={invoices} />
            )}
          </TabsContent>

          <TabsContent value="match" className="mt-4">
            <ThreeWayMatchTab invoices={invoices} />
          </TabsContent>

          <TabsContent value="approval" className="mt-4">
            <ApprovalQueueTab invoices={invoices} onApprove={handleApprove} onReject={handleReject} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
