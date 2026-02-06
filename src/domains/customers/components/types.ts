// Customer Portal Types

export interface ServiceRequest {
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

export interface Equipment {
  id: string;
  name: string;
  category?: string;
  status?: string;
  serial_number?: string;
  manufacturer?: string;
  model?: string;
  warranty_expiry?: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  total_amount: number;
  status: string;
  payment_status?: string;
  payment_received_at?: string;
  created_at: string;
  work_order?: {
    wo_number: string;
  };
}

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category_name?: string;
  views_count: number;
  helpful_count: number;
  not_helpful_count: number;
}

export interface FaqCategory {
  id: string;
  name: string;
  faq_count?: number;
}

export interface WorkOrder {
  id: string;
  wo_number: string;
  status: string;
  created_at: string;
  completed_at?: string;
}

export interface PaymentHistoryItem {
  id: string;
  payment_amount: number;
  payment_method?: string;
  payment_date?: string;
  payment_reference?: string;
  payment_status: string;
  created_at: string;
}

// Helper function for status colors
export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'submitted': return 'bg-primary';
    case 'scheduled': return 'bg-warning';
    case 'in_progress': return 'bg-info';
    case 'completed': return 'bg-success';
    case 'cancelled': return 'bg-muted';
    default: return 'bg-muted';
  }
};
