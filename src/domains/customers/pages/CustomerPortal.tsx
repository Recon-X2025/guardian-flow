import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, Package, FileText, Calendar, CreditCard, 
  Book, HelpCircle, Receipt, History, Loader2, Search,
  Eye, ChevronDown, ChevronUp, ThumbsUp, ThumbsDown
} from 'lucide-react';
import { apiClient } from '@/integrations/api/client';
import { useToast } from '@/domains/shared/hooks/use-toast';
import { useAuth } from '@/domains/auth/contexts/AuthContext';
import { useCurrency } from '@/domains/shared/hooks/useCurrency';
import { ServiceBookingDialog } from '@/domains/customers/components/ServiceBookingDialog';
import { PaymentDialog } from '@/domains/financial/components/PaymentDialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useNavigate } from 'react-router-dom';

interface ServiceRequest {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority?: string;
  request_number?: string;
  preferred_date?: string;
  preferred_time_slot?: string;
  created_at: string;
}

interface Equipment {
  id: string;
  name: string;
  category?: string;
  status?: string;
  serial_number?: string;
  manufacturer?: string;
  model?: string;
  warranty_expiry?: string;
}

interface Invoice {
  id: string;
  invoice_number: string;
  total_amount: number;
  status: string;
  payment_status?: string;
  created_at: string;
  work_order?: {
    wo_number: string;
  };
}

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category_name?: string;
  views_count: number;
  helpful_count: number;
  not_helpful_count: number;
}

interface WorkOrder {
  id: string;
  wo_number: string;
  status: string;
  created_at: string;
  completed_at?: string;
}

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
  const [faqCategories, setFaqCategories] = useState<any[]>([]);
  const [customerId, setCustomerId] = useState<string | null>(null);
  
  // UI state
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [faqSearch, setFaqSearch] = useState('');
  const [selectedFaqCategory, setSelectedFaqCategory] = useState<string>('');
  const [expandedFaqs, setExpandedFaqs] = useState<Set<string>>(new Set());
  const [paymentHistory, setPaymentHistory] = useState<Record<string, any[]>>({});
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
      // Try to get customer_id from profiles table
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

      const custId = customerResult.data?.[0]?.id || user.id; // Fallback to user.id
      setCustomerId(custId);

      // Fetch all data in parallel
      await Promise.all([
        fetchServiceRequests(custId),
        fetchEquipment(custId),
        fetchInvoices(custId),
        fetchWorkOrders(custId),
        fetchFAQs(),
      ]);
    } catch (error: any) {
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
      setServiceRequests(result.data || []);
    } catch (error: any) {
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
      setEquipment(result.data || []);
    } catch (error: any) {
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
      setInvoices(result.data || []);
    } catch (error: any) {
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
      setWorkOrders(result.data || []);
    } catch (error: any) {
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

      setFaqs(faqsResponse.data?.faqs || []);
      setFaqCategories(categoriesResponse.data?.categories || []);
    } catch (error: any) {
      console.error('Error fetching FAQs:', error);
    }
  };

  const handleProcessPayment = async (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setPaymentDialogOpen(true);
  };

  const fetchPaymentHistory = async (invoiceId: string) => {
    if (paymentHistory[invoiceId]) return; // Already loaded
    
    setLoadingPaymentHistory(prev => ({ ...prev, [invoiceId]: true }));
    try {
      const response = await apiClient.request(`/api/payments/history/${invoiceId}`, {
        method: 'GET',
      });

      if (response.error) throw response.error;
      
      setPaymentHistory(prev => ({
        ...prev,
        [invoiceId]: response.data?.payment_history || []
      }));
    } catch (error: any) {
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
    // Refresh invoices after successful payment
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

      // Refresh FAQs to update counts
      fetchFAQs();
    } catch (error: any) {
      console.error('Error submitting feedback:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted': return 'bg-primary';
      case 'scheduled': return 'bg-warning';
      case 'in_progress': return 'bg-info';
      case 'completed': return 'bg-success';
      case 'cancelled': return 'bg-muted';
      default: return 'bg-muted';
    }
  };

  const filteredFaqs = faqs.filter(faq => {
    if (selectedFaqCategory && faq.category_name !== selectedFaqCategory) return false;
    if (faqSearch) {
      const query = faqSearch.toLowerCase();
      return (
        faq.question.toLowerCase().includes(query) ||
        faq.answer.toLowerCase().includes(query)
      );
    }
    return true;
  });

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

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {serviceRequests.filter(r => ['submitted', 'scheduled'].includes(r.status)).length}
                </div>
                <p className="text-xs text-muted-foreground">Active service requests</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Registered Equipment</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{equipment.length}</div>
                <p className="text-xs text-muted-foreground">Total equipment items</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Outstanding Balance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(totalPending)}</div>
                <p className="text-xs text-muted-foreground">{pendingInvoices.length} pending invoices</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Recent Service Requests</CardTitle>
              </CardHeader>
              <CardContent>
                {serviceRequests.slice(0, 5).length > 0 ? (
                  <div className="space-y-2">
                    {serviceRequests.slice(0, 5).map((request) => (
                      <div key={request.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium text-sm">{request.title}</p>
                          <p className="text-xs text-muted-foreground">{request.status}</p>
                        </div>
                        <Badge className={getStatusColor(request.status)}>{request.status}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No service requests yet
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pending Payments</CardTitle>
              </CardHeader>
              <CardContent>
                {pendingInvoices.length > 0 ? (
                  <div className="space-y-2">
                    {pendingInvoices.slice(0, 5).map((invoice) => (
                      <div key={invoice.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium text-sm">{invoice.invoice_number}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatCurrency(Number(invoice.total_amount))}
                          </p>
                        </div>
                        <Button size="sm" onClick={() => handleProcessPayment(invoice)}>
                          Pay Now
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    All invoices paid
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Service Requests Tab */}
        <TabsContent value="requests" className="space-y-4">
          {serviceRequests.length > 0 ? (
            serviceRequests.map((request) => (
              <Card key={request.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold">{request.title}</h3>
                      <Badge className={getStatusColor(request.status)}>
                        {request.status}
                      </Badge>
                      {request.priority && (
                        <Badge variant="outline">{request.priority}</Badge>
                      )}
                    </div>
                    {request.request_number && (
                      <p className="text-sm text-muted-foreground">
                        Request # {request.request_number}
                      </p>
                    )}
                    {request.description && (
                      <p className="text-sm">{request.description}</p>
                    )}
                    {request.preferred_date && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        Preferred: {new Date(request.preferred_date).toLocaleDateString()}
                        {request.preferred_time_slot && ` - ${request.preferred_time_slot}`}
                      </div>
                    )}
                  </div>
                  <Button variant="outline" size="sm">
                    View Details
                  </Button>
                </div>
              </Card>
            ))
          ) : (
            <Card className="p-12 text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
              <p className="text-muted-foreground">
                No service requests yet. Click "Book Service" to get started.
              </p>
            </Card>
          )}
        </TabsContent>

        {/* Equipment Tab */}
        <TabsContent value="equipment" className="space-y-4">
          {equipment.length > 0 ? (
            equipment.map((eq) => (
              <Card key={eq.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">{eq.name}</h3>
                    <div className="flex gap-2">
                      {eq.category && (
                        <Badge variant="outline">{eq.category}</Badge>
                      )}
                      {eq.status && <Badge>{eq.status}</Badge>}
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      {eq.serial_number && <div>Serial #: {eq.serial_number}</div>}
                      {(eq.manufacturer || eq.model) && (
                        <div>Model: {eq.manufacturer} {eq.model}</div>
                      )}
                      {eq.warranty_expiry && (
                        <div>
                          Warranty: {new Date(eq.warranty_expiry) > new Date() ? 'Active' : 'Expired'} 
                          ({new Date(eq.warranty_expiry).toLocaleDateString()})
                        </div>
                      )}
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setBookingDialogOpen(true)}>
                    Request Service
                  </Button>
                </div>
              </Card>
            ))
          ) : (
            <Card className="p-12 text-center">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
              <p className="text-muted-foreground">
                No equipment registered yet.
              </p>
            </Card>
          )}
        </TabsContent>

        {/* Invoices & Payments Tab */}
        <TabsContent value="invoices" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Invoices</CardTitle>
                  <CardDescription>View and pay your invoices</CardDescription>
                </div>
                <Badge variant="outline" className="text-lg px-3 py-1">
                  Outstanding: {formatCurrency(totalPending)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {invoices.length > 0 ? (
                <div className="space-y-3">
                  {invoices.map((invoice) => (
                    <div
                      key={invoice.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{invoice.invoice_number}</span>
                          <Badge variant={invoice.payment_status === 'paid' ? 'default' : 'secondary'}>
                            {invoice.payment_status || invoice.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Amount: {formatCurrency(Number(invoice.total_amount))}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Created: {new Date(invoice.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <div className="flex items-center gap-2">
                          {invoice.payment_status && (
                            <Badge 
                              variant={
                                invoice.payment_status === 'paid' ? 'default' :
                                invoice.payment_status === 'partial' ? 'secondary' :
                                'destructive'
                              }
                            >
                              {invoice.payment_status}
                            </Badge>
                          )}
                          {invoice.payment_status !== 'paid' && (
                            <Button size="sm" onClick={() => handleProcessPayment(invoice)}>
                              <CreditCard className="h-4 w-4 mr-1" />
                              Pay Now
                            </Button>
                          )}
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => {
                            setSelectedInvoice(invoice);
                            if (!paymentHistory[invoice.id]) {
                              fetchPaymentHistory(invoice.id);
                            }
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View Details
                        </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Receipt className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No invoices found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Service History Tab */}
        <TabsContent value="history" className="space-y-4">
          {workOrders.length > 0 ? (
            workOrders.map((wo) => (
              <Card key={wo.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold">{wo.wo_number}</h3>
                      <Badge className={getStatusColor(wo.status)}>
                        {wo.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <p>Created: {new Date(wo.created_at).toLocaleDateString()}</p>
                      {wo.completed_at && (
                        <p>Completed: {new Date(wo.completed_at).toLocaleDateString()}</p>
                      )}
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    View Details
                  </Button>
                </div>
              </Card>
            ))
          ) : (
            <Card className="p-12 text-center">
              <History className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
              <p className="text-muted-foreground">
                No service history yet.
              </p>
            </Card>
          )}
        </TabsContent>

        {/* FAQ Tab */}
        <TabsContent value="faq" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Frequently Asked Questions</CardTitle>
              <CardDescription>Find answers to common questions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search FAQs..."
                  className="pl-10"
                  value={faqSearch}
                  onChange={(e) => setFaqSearch(e.target.value)}
                />
              </div>

              {/* Categories */}
              {faqCategories.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={selectedFaqCategory === '' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedFaqCategory('')}
                  >
                    All
                  </Button>
                  {faqCategories.map((category) => (
                    <Button
                      key={category.id}
                      variant={selectedFaqCategory === category.name ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedFaqCategory(
                        selectedFaqCategory === category.name ? '' : category.name
                      )}
                    >
                      {category.name} ({category.faq_count || 0})
                    </Button>
                  ))}
                </div>
              )}

              {/* FAQ List */}
              {filteredFaqs.length > 0 ? (
                <Accordion type="multiple" className="space-y-2">
                  {filteredFaqs.map((faq) => (
                    <AccordionItem key={faq.id} value={faq.id} className="border rounded-lg px-4">
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex-1 text-left">
                          <div className="flex items-center gap-2">
                            <HelpCircle className="h-4 w-4 text-primary" />
                            <span className="font-medium">{faq.question}</span>
                          </div>
                          {faq.category_name && (
                            <Badge variant="outline" className="mt-1 text-xs">
                              {faq.category_name}
                            </Badge>
                          )}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pt-4 pb-4">
                        <div className="space-y-3">
                          <p className="text-sm whitespace-pre-line">{faq.answer}</p>
                          <div className="flex items-center gap-4 pt-2 border-t">
                            <span className="text-xs text-muted-foreground">
                              {faq.views_count} views
                            </span>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleFaqFeedback(faq.id, true)}
                              >
                                <ThumbsUp className="h-4 w-4 mr-1" />
                                Helpful ({faq.helpful_count})
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleFaqFeedback(faq.id, false)}
                              >
                                <ThumbsDown className="h-4 w-4 mr-1" />
                                Not Helpful ({faq.not_helpful_count})
                              </Button>
                            </div>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <HelpCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No FAQs found. Try a different search term.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Invoice Detail Dialog */}
      <Dialog open={!!selectedInvoice} onOpenChange={(open) => !open && setSelectedInvoice(null)}>
        <DialogContent className="max-w-2xl">
          {selectedInvoice && (
            <>
              <DialogHeader>
                <DialogTitle>Invoice {selectedInvoice.invoice_number}</DialogTitle>
                <DialogDescription>
                  Invoice details and payment information
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">Amount</p>
                    <p className="text-lg font-bold">{formatCurrency(Number(selectedInvoice.total_amount))}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Payment Status</p>
                    <Badge 
                      variant={
                        selectedInvoice.payment_status === 'paid' ? 'default' :
                        selectedInvoice.payment_status === 'partial' ? 'secondary' :
                        'destructive'
                      }
                    >
                      {selectedInvoice.payment_status || selectedInvoice.status || 'pending'}
                    </Badge>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium">Created</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(selectedInvoice.created_at).toLocaleDateString()}
                  </p>
                  {selectedInvoice.payment_received_at && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Paid: {new Date(selectedInvoice.payment_received_at).toLocaleDateString()}
                    </p>
                  )}
                </div>

                {/* Payment History */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium">Payment History</p>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => fetchPaymentHistory(selectedInvoice.id)}
                      disabled={loadingPaymentHistory[selectedInvoice.id]}
                    >
                      {loadingPaymentHistory[selectedInvoice.id] ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <History className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {paymentHistory[selectedInvoice.id] && paymentHistory[selectedInvoice.id].length > 0 ? (
                    <div className="space-y-2 border rounded-lg p-3 max-h-48 overflow-y-auto">
                      {paymentHistory[selectedInvoice.id].map((payment: any) => (
                        <div key={payment.id} className="flex items-center justify-between text-sm border-b pb-2 last:border-0">
                          <div>
                            <p className="font-medium">{formatCurrency(Number(payment.payment_amount))}</p>
                            <p className="text-xs text-muted-foreground">
                              {payment.payment_method || 'N/A'} • {new Date(payment.payment_date || payment.created_at).toLocaleDateString()}
                            </p>
                            {payment.payment_reference && (
                              <p className="text-xs text-muted-foreground">Ref: {payment.payment_reference}</p>
                            )}
                          </div>
                          <Badge 
                            variant={
                              payment.payment_status === 'paid' ? 'default' :
                              payment.payment_status === 'partial' ? 'secondary' :
                              'destructive'
                            }
                          >
                            {payment.payment_status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4 border rounded-lg">
                      No payment history yet
                    </p>
                  )}
                </div>

                {selectedInvoice.payment_status !== 'paid' && (
                  <Button 
                    className="w-full" 
                    onClick={() => handleProcessPayment(selectedInvoice)}
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Pay Now
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

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
