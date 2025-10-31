-- Template Ingestion Module Database Schema

-- Create storage bucket for document templates
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'document-templates',
  'document-templates',
  false,
  10485760, -- 10MB limit
  ARRAY['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/pdf', 'text/html']
)
ON CONFLICT (id) DO NOTHING;

-- Template metadata table
CREATE TABLE IF NOT EXISTS public.document_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  template_name TEXT NOT NULL,
  template_type TEXT NOT NULL CHECK (template_type IN ('invoice', 'quotation', 'service_order', 'work_order', 'warranty_certificate')),
  file_format TEXT NOT NULL CHECK (file_format IN ('docx', 'pdf', 'html')),
  storage_path TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  placeholders JSONB NOT NULL DEFAULT '[]', -- Array of required placeholder names
  preview_data JSONB, -- Sample data for preview
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(tenant_id, template_type, version)
);

-- Template version history for rollback
CREATE TABLE IF NOT EXISTS public.template_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.document_templates(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  storage_path TEXT NOT NULL,
  placeholders JSONB NOT NULL,
  change_description TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(template_id, version)
);

-- Template usage audit log
CREATE TABLE IF NOT EXISTS public.template_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.document_templates(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  rendered_for_entity_id UUID, -- work_order_id, invoice_id, etc.
  rendered_by UUID REFERENCES auth.users(id),
  rendered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  rendering_time_ms INTEGER,
  output_format TEXT
);

-- Enable RLS
ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_usage_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for document_templates
CREATE POLICY "Tenants can view their own templates"
  ON public.document_templates FOR SELECT
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Tenant admins can insert templates"
  ON public.document_templates FOR INSERT
  WITH CHECK (
    tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
    AND public.has_any_role(auth.uid(), ARRAY['tenant_admin', 'sys_admin']::app_role[])
  );

CREATE POLICY "Tenant admins can update templates"
  ON public.document_templates FOR UPDATE
  USING (
    tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
    AND public.has_any_role(auth.uid(), ARRAY['tenant_admin', 'sys_admin']::app_role[])
  );

CREATE POLICY "Tenant admins can delete templates"
  ON public.document_templates FOR DELETE
  USING (
    tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
    AND public.has_any_role(auth.uid(), ARRAY['tenant_admin', 'sys_admin']::app_role[])
  );

-- RLS Policies for template_versions
CREATE POLICY "Tenants can view template versions"
  ON public.template_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.document_templates
      WHERE id = template_versions.template_id
      AND tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Tenant admins can create versions"
  ON public.template_versions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.document_templates
      WHERE id = template_versions.template_id
      AND tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
    )
    AND public.has_any_role(auth.uid(), ARRAY['tenant_admin', 'sys_admin']::app_role[])
  );

-- RLS Policies for template_usage_log
CREATE POLICY "Tenants can view their usage logs"
  ON public.template_usage_log FOR SELECT
  USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can log template usage"
  ON public.template_usage_log FOR INSERT
  WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- Storage policies for templates
CREATE POLICY "Tenant admins can upload templates"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'document-templates'
    AND (storage.foldername(name))[1] = (SELECT tenant_id::text FROM public.profiles WHERE id = auth.uid())
    AND public.has_any_role(auth.uid(), ARRAY['tenant_admin', 'sys_admin']::app_role[])
  );

CREATE POLICY "Tenants can view their templates"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'document-templates'
    AND (storage.foldername(name))[1] = (SELECT tenant_id::text FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Tenant admins can update templates"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'document-templates'
    AND (storage.foldername(name))[1] = (SELECT tenant_id::text FROM public.profiles WHERE id = auth.uid())
    AND public.has_any_role(auth.uid(), ARRAY['tenant_admin', 'sys_admin']::app_role[])
  );

CREATE POLICY "Tenant admins can delete templates"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'document-templates'
    AND (storage.foldername(name))[1] = (SELECT tenant_id::text FROM public.profiles WHERE id = auth.uid())
    AND public.has_any_role(auth.uid(), ARRAY['tenant_admin', 'sys_admin']::app_role[])
  );

-- Indexes for performance
CREATE INDEX idx_document_templates_tenant ON public.document_templates(tenant_id, template_type);
CREATE INDEX idx_document_templates_active ON public.document_templates(tenant_id, is_active);
CREATE INDEX idx_template_versions_template ON public.template_versions(template_id, version);
CREATE INDEX idx_template_usage_tenant ON public.template_usage_log(tenant_id, rendered_at DESC);

-- Trigger for updated_at
CREATE TRIGGER update_document_templates_updated_at
  BEFORE UPDATE ON public.document_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();