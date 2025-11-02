import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

export default function CompanyOnboarding() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  
  const { planId, billingCycle, selectedModules } = location.state || {};
  
  const [formData, setFormData] = useState({
    companyName: '',
    industry: '',
    companySize: '',
    phoneNumber: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!planId) {
      navigate('/auth/select-plan');
    }
  }, [planId, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!user) throw new Error('Not authenticated');

      // 1. Get user's profile to check tenant_id
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;
      
      let tenantId = profile?.tenant_id;

      // 2. Get the plan ID from database
      const { data: plan, error: planError } = await supabase
        .from('subscription_plans')
        .select('id')
        .eq('name', planId)
        .single();

      if (planError) throw planError;
      const actualPlanId = plan.id;

      // 3. If no tenant_id, update tenant or create new one
      if (!tenantId) {
        // Update user profile with company info
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            full_name: formData.companyName,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);

        if (updateError) throw updateError;

        // Get tenant_id after update
        const { data: updatedProfile, error: getTenantError } = await supabase
          .from('profiles')
          .select('tenant_id')
          .eq('id', user.id)
          .single();

        if (getTenantError) throw getTenantError;
        tenantId = updatedProfile?.tenant_id;

        if (!tenantId) {
          throw new Error('Failed to get tenant ID');
        }
      }

      // 4. Calculate trial dates
      const trialStart = new Date();
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + (planId === 'free' ? 0 : planId === 'starter' ? 14 : 30));

      // 5. Create subscription
      const { error: subscriptionError } = await supabase
        .from('tenant_subscriptions')
        .insert({
          tenant_id: tenantId,
          plan_id: actualPlanId,
          selected_modules: selectedModules || [],
          status: planId === 'free' ? 'active' : 'trial',
          billing_frequency: billingCycle || 'monthly',
          trial_start: planId === 'free' ? null : trialStart.toISOString(),
          trial_end: planId === 'free' ? null : trialEnd.toISOString(),
          current_period_start: trialStart.toISOString(),
          current_period_end: planId === 'free' 
            ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year for free
            : trialEnd.toISOString()
        });

      if (subscriptionError) throw subscriptionError;

      // 6. Update tenant with company info
      const { error: tenantError } = await supabase
        .from('tenants')
        .update({
          name: formData.companyName,
          onboarding_completed: true,
          signup_source: 'web'
        })
        .eq('id', tenantId);

      if (tenantError) throw tenantError;

      // 7. Redirect to dashboard
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Onboarding error:', err);
      setError(err.message || 'Failed to complete onboarding. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/10 via-background to-accent/10">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-3xl text-center">Complete Your Setup</CardTitle>
          <CardDescription className="text-center">
            Tell us about your company to get started
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="companyName">Company Name *</Label>
              <Input
                id="companyName"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                required
                placeholder="Acme Corporation"
              />
            </div>

            <div>
              <Label htmlFor="industry">Industry</Label>
              <Input
                id="industry"
                value={formData.industry}
                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                placeholder="Manufacturing, Healthcare, etc."
              />
            </div>

            <div>
              <Label htmlFor="companySize">Company Size</Label>
              <Input
                id="companySize"
                value={formData.companySize}
                onChange={(e) => setFormData({ ...formData, companySize: e.target.value })}
                placeholder="e.g., 50-100 employees"
              />
            </div>

            <div>
              <Label htmlFor="phoneNumber">Phone Number</Label>
              <Input
                id="phoneNumber"
                type="tel"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                placeholder="+1 (555) 123-4567"
              />
            </div>

            {error && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded">
                {error}
              </div>
            )}

            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Setting up your account...
                </>
              ) : (
                'Complete Setup & Start Trial'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

