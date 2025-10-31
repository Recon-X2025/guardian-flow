-- Fix all 18 missing RLS policies for Guardian Flow v7.0

-- ============================================
-- PHASE 1: Analytics & Monitoring (4 tables)
-- ============================================

-- 1. scheduled_reports - Tenant admins manage scheduled reports
ALTER TABLE scheduled_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant admins manage scheduled reports" ON scheduled_reports
FOR ALL USING (
  has_any_role(auth.uid(), ARRAY['sys_admin'::app_role, 'tenant_admin'::app_role, 'ops_manager'::app_role])
  AND (tenant_id IS NULL OR tenant_id = get_user_tenant_id(auth.uid()))
);

-- 2. analytics_cache - Authenticated users read cached analytics for their tenant
ALTER TABLE analytics_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read tenant analytics cache" ON analytics_cache
FOR SELECT USING (
  auth.role() = 'authenticated' 
  AND (tenant_id IS NULL OR tenant_id = get_user_tenant_id(auth.uid()))
);

CREATE POLICY "System writes analytics cache" ON analytics_cache
FOR INSERT WITH CHECK (true);

CREATE POLICY "System updates analytics cache" ON analytics_cache
FOR UPDATE USING (true);

CREATE POLICY "System deletes expired cache" ON analytics_cache
FOR DELETE USING (expires_at < now());

-- 3. system_health_metrics - System admins and ops managers only
ALTER TABLE system_health_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view health metrics" ON system_health_metrics
FOR SELECT USING (
  has_any_role(auth.uid(), ARRAY['sys_admin'::app_role, 'ops_manager'::app_role, 'ml_ops'::app_role])
);

CREATE POLICY "System inserts health metrics" ON system_health_metrics
FOR INSERT WITH CHECK (true);

-- 4. report_audit - Tenant admins view audit logs for their tenant
ALTER TABLE report_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant admins view report audit" ON report_audit
FOR SELECT USING (
  has_any_role(auth.uid(), ARRAY['sys_admin'::app_role, 'tenant_admin'::app_role, 'auditor'::app_role])
  AND (tenant_id IS NULL OR tenant_id = get_user_tenant_id(auth.uid()))
);

CREATE POLICY "System inserts report audit" ON report_audit
FOR INSERT WITH CHECK (true);

-- ============================================
-- PHASE 2: AI/ML & Marketplace (7 tables)
-- ============================================

-- 5. ab_test_experiments - ML ops and admins manage experiments
ALTER TABLE ab_test_experiments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ML ops manage experiments" ON ab_test_experiments
FOR ALL USING (
  has_any_role(auth.uid(), ARRAY['sys_admin'::app_role, 'ml_ops'::app_role, 'ops_manager'::app_role])
);

CREATE POLICY "All authenticated view experiments" ON ab_test_experiments
FOR SELECT USING (auth.role() = 'authenticated');

-- 6. ab_test_results - System inserts, ML ops view all
ALTER TABLE ab_test_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System inserts test results" ON ab_test_results
FOR INSERT WITH CHECK (true);

CREATE POLICY "ML ops view test results" ON ab_test_results
FOR SELECT USING (
  has_any_role(auth.uid(), ARRAY['sys_admin'::app_role, 'ml_ops'::app_role])
);

-- 7. model_performance_metrics - ML ops manage performance data
ALTER TABLE model_performance_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ML ops manage metrics" ON model_performance_metrics
FOR ALL USING (
  has_any_role(auth.uid(), ARRAY['sys_admin'::app_role, 'ml_ops'::app_role])
);

CREATE POLICY "System inserts performance metrics" ON model_performance_metrics
FOR INSERT WITH CHECK (true);

-- 8. sapos_feedback - Users provide feedback, admins view all
ALTER TABLE sapos_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users create own feedback" ON sapos_feedback
FOR INSERT WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Users view own feedback" ON sapos_feedback
FOR SELECT USING (auth.uid() = customer_id);

CREATE POLICY "Admins view all feedback" ON sapos_feedback
FOR SELECT USING (
  has_any_role(auth.uid(), ARRAY['sys_admin'::app_role, 'tenant_admin'::app_role, 'ml_ops'::app_role])
);

-- 9. marketplace_extensions - Public read approved, admins manage
ALTER TABLE marketplace_extensions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read approved extensions" ON marketplace_extensions
FOR SELECT USING (status = 'approved' OR has_any_role(auth.uid(), ARRAY['sys_admin'::app_role]));

CREATE POLICY "Admins manage extensions" ON marketplace_extensions
FOR ALL USING (has_role(auth.uid(), 'sys_admin'::app_role));

-- 10. extension_reviews - Users create own reviews, public read
ALTER TABLE extension_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users create own reviews" ON extension_reviews
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own reviews" ON extension_reviews
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Public read reviews" ON extension_reviews
FOR SELECT USING (auth.role() = 'authenticated');

-- 11. marketplace_transactions - Users view own, admins view all
ALTER TABLE marketplace_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own transactions" ON marketplace_transactions
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins view all transactions" ON marketplace_transactions
FOR SELECT USING (has_role(auth.uid(), 'sys_admin'::app_role));

CREATE POLICY "System creates transactions" ON marketplace_transactions
FOR INSERT WITH CHECK (true);

-- ============================================
-- PHASE 3: Mobile & Communication (3 tables)
-- ============================================

-- 12. notification_queue - Users view own notifications
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notifications" ON notification_queue
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System manages notifications" ON notification_queue
FOR ALL USING (true);

-- 13. notification_delivery_log - System managed, admins view
ALTER TABLE notification_delivery_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view delivery logs" ON notification_delivery_log
FOR SELECT USING (
  has_any_role(auth.uid(), ARRAY['sys_admin'::app_role, 'tenant_admin'::app_role])
);

CREATE POLICY "System manages delivery logs" ON notification_delivery_log
FOR ALL USING (true);

-- 14. customer_communication_preferences - Users manage own preferences
ALTER TABLE customer_communication_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own preferences" ON customer_communication_preferences
FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- PHASE 4: Portal & Compliance (5 tables)
-- ============================================

-- 15. portal_sessions - Users view own sessions, admins view all
ALTER TABLE portal_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own sessions" ON portal_sessions
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins view all sessions" ON portal_sessions
FOR SELECT USING (
  has_any_role(auth.uid(), ARRAY['sys_admin'::app_role, 'tenant_admin'::app_role, 'auditor'::app_role])
);

CREATE POLICY "System creates sessions" ON portal_sessions
FOR INSERT WITH CHECK (true);

-- 16. disputes - Customers manage own disputes, admins manage all
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers manage own disputes" ON disputes
FOR ALL USING (auth.uid() = customer_id);

CREATE POLICY "Admins manage all disputes" ON disputes
FOR ALL USING (
  has_any_role(auth.uid(), ARRAY['sys_admin'::app_role, 'tenant_admin'::app_role, 'finance_manager'::app_role])
);

-- 17. customer_surveys - Customers create own, admins view all
ALTER TABLE customer_surveys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers create own surveys" ON customer_surveys
FOR INSERT WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Customers view own surveys" ON customer_surveys
FOR SELECT USING (auth.uid() = customer_id);

CREATE POLICY "Admins view all surveys" ON customer_surveys
FOR SELECT USING (
  has_any_role(auth.uid(), ARRAY['sys_admin'::app_role, 'tenant_admin'::app_role])
);

-- 18. user_behavior_events - System inserts, admins view
ALTER TABLE user_behavior_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System inserts behavior events" ON user_behavior_events
FOR INSERT WITH CHECK (true);

CREATE POLICY "Users view own events" ON user_behavior_events
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins view all events" ON user_behavior_events
FOR SELECT USING (
  has_any_role(auth.uid(), ARRAY['sys_admin'::app_role, 'tenant_admin'::app_role, 'auditor'::app_role])
);

-- 19. compliance_reports - Admins only
ALTER TABLE compliance_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view compliance reports" ON compliance_reports
FOR SELECT USING (
  has_any_role(auth.uid(), ARRAY['sys_admin'::app_role, 'tenant_admin'::app_role, 'auditor'::app_role])
  AND (tenant_id IS NULL OR tenant_id = get_user_tenant_id(auth.uid()))
);

CREATE POLICY "System creates compliance reports" ON compliance_reports
FOR INSERT WITH CHECK (true);