-- Create Knowledge Base tables
-- Generated: 2025-11-29

-- Knowledge Base Categories
CREATE TABLE IF NOT EXISTS knowledge_base_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  parent_category_id UUID REFERENCES knowledge_base_categories(id),
  tenant_id UUID,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Knowledge Base Articles
CREATE TABLE IF NOT EXISTS knowledge_base_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category_id UUID REFERENCES knowledge_base_categories(id),
  tenant_id UUID,
  author_id UUID REFERENCES users(id),
  status TEXT DEFAULT 'draft', -- 'draft', 'published', 'archived'
  view_count INTEGER DEFAULT 0,
  helpful_count INTEGER DEFAULT 0,
  not_helpful_count INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Knowledge Base Tags
CREATE TABLE IF NOT EXISTS knowledge_base_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  tenant_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(name, tenant_id)
);

-- Article-Tag Junction Table
CREATE TABLE IF NOT EXISTS knowledge_base_article_tags (
  article_id UUID REFERENCES knowledge_base_articles(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES knowledge_base_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (article_id, tag_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_kb_categories_tenant ON knowledge_base_categories(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_kb_categories_parent ON knowledge_base_categories(parent_category_id);

CREATE INDEX IF NOT EXISTS idx_kb_articles_category ON knowledge_base_articles(category_id, status);
CREATE INDEX IF NOT EXISTS idx_kb_articles_tenant ON knowledge_base_articles(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_kb_articles_author ON knowledge_base_articles(author_id);
CREATE INDEX IF NOT EXISTS idx_kb_articles_featured ON knowledge_base_articles(is_featured, published_at DESC);

CREATE INDEX IF NOT EXISTS idx_kb_tags_tenant ON knowledge_base_tags(tenant_id);
CREATE INDEX IF NOT EXISTS idx_kb_article_tags_article ON knowledge_base_article_tags(article_id);
CREATE INDEX IF NOT EXISTS idx_kb_article_tags_tag ON knowledge_base_article_tags(tag_id);

-- Triggers
CREATE TRIGGER update_kb_categories_updated_at 
  BEFORE UPDATE ON knowledge_base_categories 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_kb_articles_updated_at 
  BEFORE UPDATE ON knowledge_base_articles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

