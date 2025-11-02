-- Check RLS is enabled on tables
SELECT 'RLS Enabled Tables:' as check, tablename, rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'user_roles', 'tenants', 'vendors', 'client_vendor_contracts', 'vendor_scorecards', 'rfp_proposals')
ORDER BY tablename;

-- Count policies per table
SELECT 'Policies Count:' as check, tablename::text, COUNT(*) as policy_count
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'user_roles', 'tenants', 'vendors', 'client_vendor_contracts', 'vendor_scorecards', 'rfp_proposals')
GROUP BY tablename
ORDER BY tablename;

-- List all policies for client-vendor tables
SELECT tablename, policyname, cmd, roles
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN ('vendors', 'client_vendor_contracts', 'vendor_scorecards', 'rfp_proposals')
ORDER BY tablename, policyname;

