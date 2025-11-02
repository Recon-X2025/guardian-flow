import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check } from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  displayName: string;
  price: number;
  annualPrice: number;
  userLimit: number | null;
  trialDays: number;
  features: string[];
  isPopular?: boolean;
}

const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'free',
    displayName: 'Free',
    price: 0,
    annualPrice: 0,
    userLimit: 5,
    trialDays: 0,
    features: ['Choose 1 Module', '5 Users', 'Basic Support', '1 GB Storage']
  },
  {
    id: 'starter',
    name: 'starter',
    displayName: 'Starter',
    price: 99,
    annualPrice: 990,
    userLimit: 10,
    trialDays: 14,
    features: ['Choose 3 Modules', '10 Users', 'Email Support', '10 GB Storage']
  },
  {
    id: 'professional',
    name: 'professional',
    displayName: 'Professional',
    price: 299,
    annualPrice: 2990,
    userLimit: 50,
    trialDays: 30,
    isPopular: true,
    features: ['Choose 5 Modules', '50 Users', 'Priority Support', '100 GB Storage']
  },
  {
    id: 'enterprise',
    name: 'enterprise',
    displayName: 'Enterprise',
    price: 999,
    annualPrice: 9990,
    userLimit: null,
    trialDays: 30,
    features: ['All Modules Included', 'Unlimited Users', 'Dedicated CSM', '1 TB Storage']
  }
];

export default function PlanSelector() {
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState<string>('professional');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

  const handleContinue = async () => {
    const plan = PLANS.find(p => p.id === selectedPlan);
    if (!plan) return;
    
    // Enterprise plan includes all modules, skip module selection
    if (selectedPlan === 'enterprise') {
      navigate('/auth/onboarding', { 
        state: { 
          planId: selectedPlan, 
          billingCycle,
          selectedModules: [] // Empty array means all modules
        } 
      });
    } else {
      // Other plans require module selection
      navigate('/auth/select-modules', { 
        state: { 
          planId: selectedPlan, 
          billingCycle,
          maxModules: plan.userLimit === 5 ? 1 : plan.userLimit === 10 ? 3 : 5
        } 
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/10 via-background to-accent/10">
      <div className="w-full max-w-6xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Choose Your Plan</h1>
          <p className="text-muted-foreground">Start your free trial, no credit card required</p>
        </div>

        <div className="flex justify-center gap-2 mb-8">
          <Button
            variant={billingCycle === 'monthly' ? 'default' : 'outline'}
            onClick={() => setBillingCycle('monthly')}
          >
            Monthly
          </Button>
          <Button
            variant={billingCycle === 'annual' ? 'default' : 'outline'}
            onClick={() => setBillingCycle('annual')}
          >
            Annual <span className="ml-2 text-xs">Save 17%</span>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {PLANS.map(plan => (
            <Card
              key={plan.id}
              className={`relative cursor-pointer transition-all ${
                selectedPlan === plan.id ? 'border-primary ring-2 ring-primary' : ''
              } ${plan.isPopular ? 'border-primary' : ''}`}
              onClick={() => setSelectedPlan(plan.id)}
            >
              {plan.isPopular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-primary">Most Popular</Badge>
                </div>
              )}
              
              <CardHeader>
                <CardTitle>{plan.displayName}</CardTitle>
                <div className="mt-2">
                  <span className="text-3xl font-bold">
                    ${billingCycle === 'monthly' ? plan.price : Math.floor(plan.annualPrice / 12)}
                  </span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                {billingCycle === 'annual' && plan.price > 0 && (
                  <p className="text-xs text-muted-foreground">Billed annually</p>
                )}
                {plan.trialDays > 0 && (
                  <Badge variant="secondary" className="mt-2">
                    {plan.trialDays}-day free trial
                  </Badge>
                )}
              </CardHeader>
              
              <CardContent>
                <ul className="space-y-3">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-primary flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center">
          <Button size="lg" onClick={handleContinue}>
            {selectedPlan === 'free' ? 'Get Started' : `Start ${PLANS.find(p => p.id === selectedPlan)?.trialDays}-Day Free Trial`}
          </Button>
          <p className="text-xs text-muted-foreground mt-4">
            No credit card required • Cancel anytime
          </p>
        </div>
      </div>
    </div>
  );
}

