import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/domains/shared/hooks/use-toast';

export default function BankReconciliation() {
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ account_name: '', bank_name: '', account_number: '', currency: 'USD' });
  const { toast } = useToast();
  const qc = useQueryClient();
  const token = localStorage.getItem('auth_token');
  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) };

  const { data: accountsData } = useQuery({
    queryKey: ['bank-accounts'],
    queryFn: () => fetch('/api/bank-recon/accounts', { headers }).then(r => r.json()),
  });

  const { data: txData } = useQuery({
    queryKey: ['bank-transactions', selectedAccount?.id],
    queryFn: () => fetch(`/api/bank-recon/accounts/${selectedAccount.id}/transactions`, { headers }).then(r => r.json()),
    enabled: !!selectedAccount,
  });

  const { data: reconData } = useQuery({
    queryKey: ['bank-recon-summary', selectedAccount?.id],
    queryFn: () => fetch(`/api/bank-recon/accounts/${selectedAccount.id}/reconciliation`, { headers }).then(r => r.json()),
    enabled: !!selectedAccount,
  });

  const createAccount = useMutation({
    mutationFn: (body: any) => fetch('/api/bank-recon/accounts', { method: 'POST', headers, body: JSON.stringify(body) }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bank-accounts'] }); setAddOpen(false); toast({ title: 'Account added' }); },
  });

  const autoMatch = useMutation({
    mutationFn: (id: string) => fetch(`/api/bank-recon/accounts/${id}/auto-match`, { method: 'POST', headers }).then(r => r.json()),
    onSuccess: (d) => { qc.invalidateQueries({ queryKey: ['bank-transactions', selectedAccount?.id] }); toast({ title: `Auto-matched ${d.matched_count ?? 0} transactions` }); },
  });

  const accounts = accountsData?.accounts ?? [];
  const transactions = txData?.transactions ?? [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Bank Reconciliation</h1>
        <Button onClick={() => setAddOpen(true)}>+ Add Account</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {accounts.map((a: any) => (
          <Card key={a.id} className={`cursor-pointer ${selectedAccount?.id === a.id ? 'ring-2 ring-primary' : ''}`} onClick={() => setSelectedAccount(a)}>
            <CardHeader><CardTitle className="text-base">{a.account_name}</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{a.bank_name}</p>
              <p className="text-sm">Balance: {a.currency} {(a.current_balance ?? 0).toLocaleString()}</p>
            </CardContent>
          </Card>
        ))}
        {accounts.length === 0 && <p className="text-muted-foreground col-span-3">No bank accounts added yet.</p>}
      </div>

      {selectedAccount && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Transactions — {selectedAccount.account_name}</h2>
            <Button variant="outline" onClick={() => autoMatch.mutate(selectedAccount.id)}>Auto-Match</Button>
          </div>
          {reconData && (
            <div className="grid grid-cols-3 gap-4">
              <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold">{reconData.total_transactions ?? 0}</div><div className="text-sm text-muted-foreground">Total Transactions</div></CardContent></Card>
              <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold text-green-600">{reconData.matched_count ?? 0}</div><div className="text-sm text-muted-foreground">Matched</div></CardContent></Card>
              <Card><CardContent className="pt-4 text-center"><div className="text-2xl font-bold text-red-600">{reconData.unmatched_count ?? 0}</div><div className="text-sm text-muted-foreground">Unmatched</div></CardContent></Card>
            </div>
          )}
          <Card>
            <CardContent className="pt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-2 pr-4">Date</th>
                    <th className="py-2 pr-4">Description</th>
                    <th className="py-2 pr-4">Amount</th>
                    <th className="py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((t: any) => (
                    <tr key={t.id} className="border-b last:border-0">
                      <td className="py-2 pr-4">{t.date}</td>
                      <td className="py-2 pr-4">{t.description}</td>
                      <td className={`py-2 pr-4 font-medium ${t.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>{t.amount >= 0 ? '+' : ''}{t.amount}</td>
                      <td className="py-2">
                        <span className={`px-2 py-0.5 rounded text-xs ${t.matched ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{t.matched ? 'Matched' : 'Unmatched'}</span>
                      </td>
                    </tr>
                  ))}
                  {transactions.length === 0 && <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">No transactions yet.</td></tr>}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Bank Account</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Account Name</Label><Input value={form.account_name} onChange={e => setForm(f => ({ ...f, account_name: e.target.value }))} /></div>
            <div><Label>Bank Name</Label><Input value={form.bank_name} onChange={e => setForm(f => ({ ...f, bank_name: e.target.value }))} /></div>
            <div><Label>Account Number</Label><Input value={form.account_number} onChange={e => setForm(f => ({ ...f, account_number: e.target.value }))} /></div>
            <div><Label>Currency</Label><Input value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={() => createAccount.mutate(form)}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
