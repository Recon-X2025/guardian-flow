-- Migration: FAQ System Tables
-- Date: November 25, 2025
-- Feature: Customer Portal FAQ System

-- FAQ Categories
CREATE TABLE IF NOT EXISTS faq_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    display_order INT DEFAULT 0,
    tenant_id UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- FAQs Table
CREATE TABLE IF NOT EXISTS faqs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    category_id UUID REFERENCES faq_categories(id) ON DELETE SET NULL,
    display_order INT DEFAULT 0,
    is_published BOOLEAN DEFAULT true,
    views_count INT DEFAULT 0,
    helpful_count INT DEFAULT 0,
    not_helpful_count INT DEFAULT 0,
    tenant_id UUID,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- FAQ Feedback
CREATE TABLE IF NOT EXISTS faq_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    faq_id UUID REFERENCES faqs(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    is_helpful BOOLEAN NOT NULL,
    feedback_text TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(faq_id, user_id)
);

-- FAQ Views (for analytics)
CREATE TABLE IF NOT EXISTS faq_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    faq_id UUID REFERENCES faqs(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    viewed_at TIMESTAMPTZ DEFAULT now(),
    session_id TEXT
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_faqs_category ON faqs(category_id);
CREATE INDEX IF NOT EXISTS idx_faqs_published ON faqs(is_published, display_order);
CREATE INDEX IF NOT EXISTS idx_faqs_tenant ON faqs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_faq_views_faq ON faq_views(faq_id);

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_faqs_search ON faqs 
    USING gin(to_tsvector('english', coalesce(question, '') || ' ' || coalesce(answer, '')));

-- Insert default categories
INSERT INTO faq_categories (name, description, display_order) VALUES
    ('General', 'General questions about the service', 1),
    ('Billing & Payments', 'Questions about invoices and payments', 2),
    ('Service Requests', 'Questions about booking and managing services', 3),
    ('Equipment', 'Questions about equipment and warranties', 4),
    ('Technical Support', 'Technical troubleshooting questions', 5),
    ('Account Management', 'Questions about account settings and profile', 6)
ON CONFLICT (name) DO NOTHING;

-- Insert sample FAQs
INSERT INTO faqs (question, answer, category_id, is_published, display_order) 
SELECT 
    'How do I book a service request?',
    'You can book a service request by clicking the "Book Service" button on the Customer Portal. Fill in the service details, select a preferred date and time, and submit your request. You will receive a confirmation email once your request is processed.',
    (SELECT id FROM faq_categories WHERE name = 'Service Requests' LIMIT 1),
    true,
    1
WHERE NOT EXISTS (SELECT 1 FROM faqs WHERE question = 'How do I book a service request?');

INSERT INTO faqs (question, answer, category_id, is_published, display_order) 
SELECT 
    'How can I track my service request status?',
    'You can track your service request status in the "Service Requests" tab of the Customer Portal. Each request shows its current status (submitted, scheduled, in progress, completed) along with any updates from the service team.',
    (SELECT id FROM faq_categories WHERE name = 'Service Requests' LIMIT 1),
    true,
    2
WHERE NOT EXISTS (SELECT 1 FROM faqs WHERE question = 'How can I track my service request status?');

INSERT INTO faqs (question, answer, category_id, is_published, display_order) 
SELECT 
    'How do I pay an invoice?',
    'You can pay invoices by navigating to the "Payments" tab in the Customer Portal. Select the invoice you want to pay and click "Pay Now". You can use credit card, debit card, or other payment methods configured for your account.',
    (SELECT id FROM faq_categories WHERE name = 'Billing & Payments' LIMIT 1),
    true,
    1
WHERE NOT EXISTS (SELECT 1 FROM faqs WHERE question = 'How do I pay an invoice?');

INSERT INTO faqs (question, answer, category_id, is_published, display_order) 
SELECT 
    'What payment methods do you accept?',
    'We accept major credit cards (Visa, MasterCard, American Express), debit cards, and ACH/wire transfers. Payment processing is handled securely through our payment gateway with PCI DSS compliance.',
    (SELECT id FROM faq_categories WHERE name = 'Billing & Payments' LIMIT 1),
    true,
    2
WHERE NOT EXISTS (SELECT 1 FROM faqs WHERE question = 'What payment methods do you accept?');

INSERT INTO faqs (question, answer, category_id, is_published, display_order) 
SELECT 
    'How do I check my equipment warranty status?',
    'Navigate to the "My Equipment" tab in the Customer Portal. Each piece of equipment shows its warranty status, expiration date, and coverage details. You can also request service directly from the equipment page.',
    (SELECT id FROM faq_categories WHERE name = 'Equipment' LIMIT 1),
    true,
    1
WHERE NOT EXISTS (SELECT 1 FROM faqs WHERE question = 'How do I check my equipment warranty status?');

