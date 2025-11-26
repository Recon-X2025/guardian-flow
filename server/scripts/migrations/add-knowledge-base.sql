-- Migration: Knowledge Base Tables
-- Date: November 25, 2025
-- Feature: Knowledge Base Implementation

-- Knowledge Base Categories
CREATE TABLE IF NOT EXISTS knowledge_base_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    icon TEXT,
    display_order INT DEFAULT 0,
    tenant_id UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Knowledge Base Articles
CREATE TABLE IF NOT EXISTS knowledge_base_articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    summary TEXT,
    category_id UUID REFERENCES knowledge_base_categories(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
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

-- Knowledge Base Tags
CREATE TABLE IF NOT EXISTS knowledge_base_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    tenant_id UUID,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Article-Tag Junction Table
CREATE TABLE IF NOT EXISTS knowledge_base_article_tags (
    article_id UUID REFERENCES knowledge_base_articles(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES knowledge_base_tags(id) ON DELETE CASCADE,
    PRIMARY KEY (article_id, tag_id)
);

-- Knowledge Base Attachments (for documents, images, etc.)
CREATE TABLE IF NOT EXISTS knowledge_base_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id UUID REFERENCES knowledge_base_articles(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size BIGINT,
    file_path TEXT,
    file_url TEXT,
    mime_type TEXT,
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Article View History (for analytics)
CREATE TABLE IF NOT EXISTS knowledge_base_article_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id UUID REFERENCES knowledge_base_articles(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    viewed_at TIMESTAMPTZ DEFAULT now(),
    session_id TEXT
);

-- Article Feedback (helpful/not helpful)
CREATE TABLE IF NOT EXISTS knowledge_base_article_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id UUID REFERENCES knowledge_base_articles(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    is_helpful BOOLEAN NOT NULL,
    feedback_text TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(article_id, user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_kb_articles_category ON knowledge_base_articles(category_id);
CREATE INDEX IF NOT EXISTS idx_kb_articles_status ON knowledge_base_articles(status);
CREATE INDEX IF NOT EXISTS idx_kb_articles_tenant ON knowledge_base_articles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_kb_articles_created_at ON knowledge_base_articles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_kb_articles_views ON knowledge_base_articles(views_count DESC);

CREATE INDEX IF NOT EXISTS idx_kb_article_tags_article ON knowledge_base_article_tags(article_id);
CREATE INDEX IF NOT EXISTS idx_kb_article_tags_tag ON knowledge_base_article_tags(tag_id);

CREATE INDEX IF NOT EXISTS idx_kb_attachments_article ON knowledge_base_attachments(article_id);

CREATE INDEX IF NOT EXISTS idx_kb_views_article ON knowledge_base_article_views(article_id);
CREATE INDEX IF NOT EXISTS idx_kb_views_user ON knowledge_base_article_views(user_id);

-- Full-text search index for articles
CREATE INDEX IF NOT EXISTS idx_kb_articles_search ON knowledge_base_articles 
    USING gin(to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, '') || ' ' || coalesce(summary, '')));

-- Insert default categories
INSERT INTO knowledge_base_categories (name, description, display_order) VALUES
    ('Troubleshooting', 'Step-by-step troubleshooting guides', 1),
    ('Repair Procedures', 'Detailed repair and maintenance procedures', 2),
    ('Maintenance', 'Routine maintenance guides and schedules', 3),
    ('Reference', 'Reference materials and specifications', 4),
    ('Safety Guidelines', 'Safety protocols and best practices', 5)
ON CONFLICT (name) DO NOTHING;

