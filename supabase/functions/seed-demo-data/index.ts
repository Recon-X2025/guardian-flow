import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[seed-demo-data] Starting comprehensive data seeding...');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const results = {
      customers: 0,
      technicians: 0,
      equipment: 0,
      partners: 0,
      invoices: 0,
      penalties: 0,
      photos: 0,
      forecasts: 0,
    };

    // Get tenants
    const { data: tenants } = await supabase.from('tenants').select('id, slug');
    if (!tenants || tenants.length === 0) {
      throw new Error('No tenants found. Run seed-test-accounts first.');
    }

    // 1. Create Partners (Organizations)
    console.log('[seed-demo-data] Creating partners...');
    const partnerData = [
      { company_name: 'ServicePro Partners', partner_number: 'PTR-0001', email: 'contact@servicepro.com', phone: '+1-555-0001', status: 'active' },
      { company_name: 'TechField Solutions', partner_number: 'PTR-0002', email: 'contact@techfield.com', phone: '+1-555-0002', status: 'active' },
      { company_name: 'RepairHub Network', partner_number: 'PTR-0003', email: 'contact@repairhub.com', phone: '+44-555-0003', status: 'active' },
      { company_name: 'FixIt Partners', partner_number: 'PTR-0004', email: 'contact@fixit.com', phone: '+971-555-0004', status: 'active' },
    ];

    for (const partner of partnerData) {
      const { error } = await supabase.from('partners').upsert(partner, { onConflict: 'partner_number' });
      if (!error) results.partners++;
    }

    // 2. Create Customers
    console.log('[seed-demo-data] Creating customers...');
    const customerNames = [
      'ABC Corporation', 'TechStart Inc', 'Global Solutions Ltd', 'InnovateCo',
      'Enterprise Systems', 'Digital Dynamics', 'SmartBiz Group', 'FutureTech',
      'Prime Industries', 'Apex Ventures', 'Summit Corp', 'Velocity Labs',
      'Horizon Enterprises', 'Nexus Systems', 'Quantum Solutions', 'Stellar Inc',
      'Pinnacle Group', 'Vertex Corp', 'Zenith Holdings', 'Omega Industries'
    ];

    const customerIds: string[] = [];
    for (let i = 0; i < 20; i++) {
      const tenant = tenants[i % tenants.length];
      const { data, error } = await supabase
        .from('customers')
        .insert({
          tenant_id: tenant.id,
          company_name: customerNames[i],
          customer_number: `CUST-${String(i + 1).padStart(4, '0')}`,
          first_name: `Contact`,
          last_name: `Person${i + 1}`,
          email: `cust${i + 1}@company${i + 1}.com`,
          phone: `+1-555-${String(i + 1000).slice(-4)}`,
          status: 'active',
          customer_type: i % 3 === 0 ? 'enterprise' : 'business',
        })
        .select('id')
        .single();
      
      if (data && !error) {
        customerIds.push(data.id);
        results.customers++;
      }
    }

    // 3. Create Technicians
    console.log('[seed-demo-data] Creating technician profiles...');
    const { data: techUsers } = await supabase
      .from('user_roles')
      .select('user_id, profiles!inner(email, full_name, tenant_id)')
      .eq('role', 'technician')
      .limit(50);

    if (techUsers) {
      for (let i = 0; i < Math.min(techUsers.length, 50); i++) {
        const user = techUsers[i];
        const profile = user.profiles as any;
        
        const { error } = await supabase
          .from('technicians')
          .upsert({
            user_id: user.user_id,
            tenant_id: profile.tenant_id,
            employee_id: `TECH-${String(i + 1).padStart(4, '0')}`,
            first_name: profile.full_name?.split(' ')[0] || 'Tech',
            last_name: profile.full_name?.split(' ')[1] || `${i + 1}`,
            email: profile.email,
            phone: `+1-555-${String(2000 + i).slice(-4)}`,
            status: 'active',
            certification_level: ['junior', 'senior', 'expert'][i % 3],
            certifications: ['CompTIA A+', 'Network+', 'ITIL'],
            specializations: i % 2 === 0 ? ['PC Repair', 'Hardware'] : ['Printer Service', 'Toner'],
            hire_date: new Date(Date.now() - Math.random() * 365 * 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            home_location: { lat: 40.7128, lng: -74.0060 },
            current_location: { lat: 40.7128 + Math.random() * 0.1, lng: -74.0060 + Math.random() * 0.1 },
          }, { onConflict: 'user_id' });
        
        if (!error) results.technicians++;
      }
    }

    // 4. Create Equipment
    console.log('[seed-demo-data] Creating equipment...');
    const equipmentTypes = [
      { category: 'Printer', manufacturer: 'HP', models: ['LaserJet Pro 400', 'OfficeJet Pro 8000', 'Color LaserJet Enterprise'] },
      { category: 'Desktop', manufacturer: 'Dell', models: ['OptiPlex 7090', 'Precision 3660', 'Vostro 3910'] },
      { category: 'Laptop', manufacturer: 'Lenovo', models: ['ThinkPad X1', 'IdeaPad 5', 'Legion 5'] },
      { category: 'Printer', manufacturer: 'Canon', models: ['ImageCLASS MF445dw', 'PIXMA G6020', 'imagePROGRAF'] },
    ];

    for (let i = 0; i < 100; i++) {
      if (customerIds.length === 0) break;
      
      const tenant = tenants[i % tenants.length];
      const customer = customerIds[i % customerIds.length];
      const eqType = equipmentTypes[i % equipmentTypes.length];
      const model = eqType.models[i % eqType.models.length];
      
      const { error } = await supabase
        .from('equipment')
        .insert({
          tenant_id: tenant.id,
          customer_id: customer,
          equipment_number: `EQ-${String(i + 1).padStart(6, '0')}`,
          name: `${eqType.manufacturer} ${model}`,
          category: eqType.category,
          manufacturer: eqType.manufacturer,
          model: model,
          serial_number: `SN-${String(Math.floor(Math.random() * 1000000)).padStart(8, '0')}`,
          status: ['active', 'maintenance'][i % 10 === 0 ? 1 : 0],
          purchase_date: new Date(Date.now() - Math.random() * 1095 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          warranty_expiry: new Date(Date.now() + Math.random() * 730 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          location: {
            building: 'Main Office',
            floor: Math.floor(Math.random() * 5) + 1,
            room: `${Math.floor(Math.random() * 20) + 100}`
          },
        });
      
      if (!error) results.equipment++;
    }

    // 5. Generate Invoices for Completed Work Orders
    console.log('[seed-demo-data] Generating invoices...');
    const { data: completedWOs } = await supabase
      .from('work_orders')
      .select('id, cost_to_customer, ticket_id, tickets(customer_id)')
      .eq('status', 'completed')
      .is('cost_to_customer', 'not.null')
      .limit(50);

    if (completedWOs) {
      for (let i = 0; i < completedWOs.length; i++) {
        const wo = completedWOs[i];
        const tickets = wo.tickets as any;
        const subtotal = Number(wo.cost_to_customer) || 100;
        const penalties = Math.random() > 0.7 ? subtotal * 0.05 : 0;
        
        const { error } = await supabase
          .from('invoices')
          .insert({
            invoice_number: `INV-2025-${String(i + 1).padStart(4, '0')}`,
            work_order_id: wo.id,
            customer_id: tickets?.customer_id,
            subtotal: subtotal,
            penalties: penalties,
            total_amount: subtotal - penalties,
            status: ['draft', 'sent', 'paid'][i % 3],
            due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          });
        
        if (!error) results.invoices++;
      }
    }

    // 6. Apply Penalties
    console.log('[seed-demo-data] Applying penalties...');
    const { data: releasedWOs } = await supabase
      .from('work_orders')
      .select('id, technician_id, cost_to_customer')
      .in('status', ['completed', 'in_progress'])
      .limit(30);

    if (releasedWOs) {
      const penaltyCodes = [
        { code: 'SLA-BREACH-01', type: 'sla_breach', severity: 'medium', percentage: 5 },
        { code: 'LATE-COMP-02', type: 'late_completion', severity: 'low', percentage: 3 },
        { code: 'NO-SHOW-03', type: 'no_show', severity: 'high', percentage: 10 },
        { code: 'QUAL-ISSUE-04', type: 'quality_issue', severity: 'medium', percentage: 7 },
      ];

      for (let i = 0; i < Math.min(releasedWOs.length, 20); i++) {
        const wo = releasedWOs[i];
        const penalty = penaltyCodes[i % penaltyCodes.length];
        const baseAmount = Number(wo.cost_to_customer) || 100;
        const penaltyAmount = baseAmount * (penalty.percentage / 100);
        
        const { error } = await supabase
          .from('penalty_applications')
          .insert({
            work_order_id: wo.id,
            penalty_code: penalty.code,
            reason: `${penalty.type}: ${penalty.severity} severity violation`,
            amount: penaltyAmount,
            disputed: i % 5 === 0,
            dispute_reason: i % 5 === 0 ? 'Contesting penalty application' : null,
          });
        
        if (!error) results.penalties++;
      }
    }

    // 7. Create Photo Validations
    console.log('[seed-demo-data] Creating photo validations...');
    const { data: photoWOs } = await supabase
      .from('work_orders')
      .select('id')
      .in('status', ['in_progress', 'completed'])
      .limit(40);

    if (photoWOs) {
      for (let i = 0; i < photoWOs.length; i++) {
        const wo = photoWOs[i];
        const stages = ['post_repair', 'replacement', 'pickup'];
        
        for (const stage of stages.slice(0, i % 3 === 0 ? 3 : (i % 2 === 0 ? 2 : 1))) {
          const { error } = await supabase
            .from('photo_validations')
            .insert({
              work_order_id: wo.id,
              stage: stage,
              photos_validated: true,
              validation_result: {
                photo_count: 2,
                timestamps_valid: true,
                metadata_complete: true,
              },
              anomaly_detected: i % 15 === 0,
              anomaly_details: i % 15 === 0 ? {
                type: 'timestamp_mismatch',
                confidence: 0.85,
                description: 'Photo timestamp does not match work order timeline'
              } : null,
            });
          
          if (!error) results.photos++;
        }
      }
    }

    // 8. Generate Forecast Data (temporarily disabled to avoid schema mismatch)
    try {
      console.log('[seed-demo-data] Skipping forecast generation due to schema mismatch in forecast_outputs');
    } catch (_) {
      // no-op
    }

    console.log('[seed-demo-data] Seeding complete!', results);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Demo data seeding complete',
        results,
        summary: {
          customers: `${results.customers} customers created`,
          technicians: `${results.technicians} technician profiles created`,
          equipment: `${results.equipment} equipment items registered`,
          partners: `${results.partners} partner organizations created`,
          invoices: `${results.invoices} invoices generated`,
          penalties: `${results.penalties} penalties applied`,
          photo_validations: `${results.photos} photo validations created`,
          forecasts: `${results.forecasts} forecast records generated`,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[seed-demo-data] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
