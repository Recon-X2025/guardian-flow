import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Book, Loader2 } from 'lucide-react';
import { apiClient } from '@/integrations/api/client';
import { useToast } from '@/domains/shared/hooks/use-toast';
import { useAuth } from '@/domains/auth/contexts/AuthContext';
import { useCurrency } from '@/domains/shared/hooks/useCurrency';
import { useNavigate } from 'react-router-dom';
import { PaymentDialog } from '@/domains/financial/components/PaymentDialog';

// Import extracted components
import {
  ServiceRequest,
  Equipment,
  Invoice,
  FAQ,
  FaqCategory,
  WorkOrder,
  PaymentHistoryItem,
  OverviewTab,
  ServiceRequestsTab,
  EquipmentTab,
  InvoicesTab,
  ServiceHistoryTab,
  FaqTab,
  InvoiceDetailDialog,
  ServiceBookingDialog,
} from '@/domains/customers/components';

export default function CustomerPortal() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { formatCurrency } = useCurrency();
  const navigate = useNavigate();
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Data state
  const [serviceRequests, setServiceRequests] = useState<ServiceRequest[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [faqCategories, setFaqCategories] = useState<FaqCategory[]>([]);
  const [customerId, setCustomerId] = useState<string | null>(null);

  // UI state
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [faqSearch, setFaqSearch] = useState('');
  const [selectedFaqCategory, setSelectedFaqCategory] = useState<string>('');
  const [paymentHistory, setPaymentHistory] = useState<Record<string, PaymentHistoryItem[]>>({});
  const [loadingPaymentHistory, setLoadingPaymentHistory] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (user) {
      fetchCustomerData();
    }
  }, [user]);

  const fetchCustomerData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Get customer ID from profile or direct lookup
      const profileResult = await apiClient
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .limit(1)
        .then();

      if (profileResult.error) throw profileResult.error;

      // Alternative: Get from customers table by email
      const customerResult = await apiClient
        .from('customers')
        .select('id')
        .eq('email', user.email)
        .limit(1)
        .then();

      const customerData = customerResult.data as { id: string }[] | null;
      const custId = customerData?.[0]?.id || user.id;
      setCustomerId(custId);

      // Fetch all data in parallel
      await Promise.all([
        fetchServiceRequests(custId),
        fetchEquipment(custId),
        fetchInvoices(custId),
        fetchWorkOrders(custId),
        fetchFAQs(),
      ]);
    } catch (error: unknown) {
      console.error('Error fetching customer data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load customer data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchServiceRequests = async (custId: string) => {
    try {
      const result = await apiClient
        .from('service_requests')
        .select('*')
        .eq('customer_id', custId)
        .order('created_at', { ascending: false })
        .then();

      if (result.error) throw result.error;
      setServiceRequests((result.data || []) as ServiceRequest[]);
    } catch (error: unknown) {
      console.error('Error fetching service requests:', error);
    }
  };

  const fetchEquipment = async (custId: string) => {
    try {
      const result = await apiClient
        .from('equipment')
        .select('*')
        .eq('customer_id', custId)
        .then();

      if (result.error) throw result.error;
      setEquipment((result.data || []) as Equipment[]);
    } catch (error: unknown) {
      console.error('Error fetching equipment:', error);
    }
  };

  const fetchInvoices = async (custId: string) => {
    try {
      const result = await apiClient
        .from('invoices')
        .select('*, work_order:work_orders(wo_number)')
        .eq('customer_id', custId)
        .order('created_at', { ascending: false })
        .limit(50)
        .then();

      if (result.error) throw result.error;
      setInvoices((result.data || []) as Invoice[]);
    } catch (error: unknown) {
      console.error('Error fetching invoices:', error);
    }
  };

  const fetchWorkOrders = async (custId: string) => {
    try {
      const result = await apiClient
        .from('work_orders')
        .select('id, wo_number, status, created_at, completed_at')
        .eq('customer_id', custId)
        .order('created_at', { ascending: false })
        .limit(50)
        .then();

      if (result.error) throw result.error;
      setWorkOrders((result.data || []) as WorkOrder[]);
    } catch (error: unknown) {
      console.error('Error fetching work orders:', error);
    }
  };

  const fetchFAQs = async () => {
    try {
      const [faqsResponse, categoriesResponse] = await Promise.all([
        apiClient.request('/api/faqs?published_only=true', { method: 'GET' }),
        apiClient.request('/api/faqs/categories', { method: 'GET' }),
      ]);

      if (faqsResponse.error) throw faqsResponse.error;
      if (categoriesResponse.error) throw categoriesResponse.error;

      const faqData = faqsResponse.data as { faqs?: FAQ[] } | null;
      const categoryData = categoriesResponse.data as { categories?: FaqCategory[] } | null;
      setFaqs(faqData?.faqs || []);
      setFaqCategories(categoryData?.categories || []);
    } catch (error: unknown) {
      console.error('Error fetching FAQs:', error);
    }
  };

  const handleProcessPayment = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setPaymentDialogOpen(true);
  };

  const handleViewInvoiceDetails = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setInvoiceDialogOpen(true);
    if (!paymentHistory[invoice.id]) {
      fetchPaymentHistory(invoice.id);
    }
  };

  const fetchPaymentHistory = async (invoiceId: string) => {
    if (paymentHistory[invoiceId]) return;

    setLoadingPaymentHistory(prev => ({ ...prev, [invoiceId]: true }));
    try {
      const response = await apiClient.request(`/api/payments/history/${invoiceId}`, {
        method: 'GET',
      });

      if (response.error) throw response.error;

      const historyData = response.data as { payment_history?: PaymentHistoryItem[] } | null;
      setPaymentHistory(prev => ({
        ...prev,
        [invoiceId]: historyData?.payment_history || []
      }));
    } catch (error: unknown) {
      console.error('Error fetching payment history:', error);
      toast({
        title: 'Error',
        description: 'Failed to load payment history',
        variant: 'destructive',
      });
    } finally {
      setLoadingPaymentHistory(prev => ({ ...prev, [invoiceId]: false }));
    }
  };

  const handlePaymentSuccess = () => {
    if (customerId) {
      fetchInvoices(customerId);
    }
    setPaymentDialogOpen(false);
    setSelectedInvoice(null);
  };

  const handleFaqFeedback = async (faqId: string, isHelpful: boolean) => {
    try {
      const response = await apiClient.request(`/api/faqs/${faqId}/feedback`, {
        method: 'POST',
        body: JSON.stringify({ is_helpful: isHelpful }),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.error) throw response.error;

      toast({
        title: 'Feedback Submitted',
        description: 'Thank you for your feedback!',
      });

      fetchFAQs();
    } catch (error: unknown) {
      console.error('Error submitting feedback:', error);
    }
  };

  // Computed values
  const pendingInvoices = invoices.filter(inv =>
    ['draft', 'sent', 'overdue'].includes(inv.status) &&
    inv.payment_status !== 'paid'
  );
  const totalPending = pendingInvoices.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Customer Portal</h1>
          <p className="text-muted-foreground mt-1">
            Manage your service requests, equipment, invoices, and more
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/knowledge-base')}>
            <Book className="h-4 w-4 mr-2" />
            Knowledge Base
          </Button>
          <Button onClick={() => setBookingDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Book Service
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="requests">Service Requests</TabsTrigger>
          <TabsTrigger value="equipment">Equipment</TabsTrigger>
          <TabsTrigger value="invoices">Invoices & Payments</TabsTrigger>
          <TabsTrigger value="history">Service History</TabsTrigger>
          <TabsTrigger value="faq">FAQs</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab
            serviceRequests={serviceRequests}
            equipment={equipment}
            pendingInvoices={pendingInvoices}
            totalPending={totalPending}
            formatCurrency={formatCurrency}
            onProcessPayment={handleProcessPayment}
          />
        </TabsContent>

        <TabsContent value="requests" className="space-y-4">
          <ServiceRequestsTab serviceRequests={serviceRequests} />
        </TabsContent>

        <TabsContent value="equipment" className="space-y-4">
          <EquipmentTab
            equipment={equipment}
            onRequestService={() => setBookingDialogOpen(true)}
          />
        </TabsContent>

        <TabsContent value="invoices" className="space-y-4">
          <InvoicesTab
            invoices={invoices}
            totalPending={totalPending}
            formatCurrency={formatCurrency}
            onProcessPayment={handleProcessPayment}
            onViewDetails={handleViewInvoiceDetails}
          />
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <ServiceHistoryTab workOrders={workOrders} />
        </TabsContent>

        <TabsContent value="faq" className="space-y-4">
          <FaqTab
            faqs={faqs}
            faqCategories={faqCategories}
            faqSearch={faqSearch}
            selectedFaqCategory={selectedFaqCategory}
            onSearchChange={setFaqSearch}
            onCategoryChange={setSelectedFaqCategory}
            onFeedback={handleFaqFeedback}
          />
        </TabsContent>
      </Tabs>

      {/* Invoice Detail Dialog */}
      <InvoiceDetailDialog
        invoice={selectedInvoice}
        open={invoiceDialogOpen}
        onOpenChange={setInvoiceDialogOpen}
        paymentHistory={selectedInvoice ? paymentHistory[selectedInvoice.id] || [] : []}
        loadingPaymentHistory={selectedInvoice ? loadingPaymentHistory[selectedInvoice.id] || false : false}
        formatCurrency={formatCurrency}
        onFetchPaymentHistory={() => selectedInvoice && fetchPaymentHistory(selectedInvoice.id)}
        onProcessPayment={() => selectedInvoice && handleProcessPayment(selectedInvoice)}
      />

      <ServiceBookingDialog
        open={bookingDialogOpen}
        onOpenChange={setBookingDialogOpen}
        onSuccess={() => {
          if (customerId) {
            fetchServiceRequests(customerId);
          }
        }}
      />

      {selectedInvoice && (
        <PaymentDialog
          open={paymentDialogOpen}
          onOpenChange={setPaymentDialogOpen}
          invoice={selectedInvoice || { id: '', invoice_number: '', total_amount: 0 }}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
}
