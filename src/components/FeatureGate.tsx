import { ReactNode } from 'react';
import { usePlanFeatures } from '@/hooks/usePlanFeatures';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock } from 'lucide-react';

interface FeatureGateProps {
  children: ReactNode;
  requiredModule?: string;
  requiredFeature?: string;
  fallback?: ReactNode;
}

export default function FeatureGate({ 
  children, 
  requiredModule, 
  requiredFeature,
  fallback 
}: FeatureGateProps) {
  const { hasModule, hasFeature, currentPlan, isTrial } = usePlanFeatures();

  const hasAccess = 
    (!requiredModule || hasModule(requiredModule)) &&
    (!requiredFeature || hasFeature(requiredFeature));

  if (hasAccess) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <Card className="mt-8">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Lock className="h-5 w-5 text-muted-foreground" />
          <CardTitle>Premium Feature</CardTitle>
        </div>
        <CardDescription>
          This feature requires a {requiredModule ? `${requiredModule} module` : 'premium plan'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          {currentPlan && isTrial 
            ? `Upgrade your plan to unlock this feature during your trial.`
            : `Upgrade your plan to unlock this feature.`
          }
        </p>
        <Button onClick={() => window.location.href = '/auth/select-plan'}>
          Upgrade Plan
        </Button>
      </CardContent>
    </Card>
  );
}

