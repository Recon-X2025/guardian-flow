import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { usePlanFeatures } from '@/hooks/usePlanFeatures';
import { AlertCircle, Clock } from 'lucide-react';

export default function TrialBanner() {
  const { isTrial, trialDaysRemaining, currentPlan } = usePlanFeatures();

  if (!isTrial) return null;

  const isExpiringSoon = trialDaysRemaining <= 7 && trialDaysRemaining > 0;
  const isExpired = trialDaysRemaining <= 0;

  if (isExpired) {
    return (
      <Alert variant="destructive" className="m-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Trial Expired</AlertTitle>
        <AlertDescription className="flex items-center justify-between">
          <span>Your trial has ended. Upgrade to continue using Guardian Flow.</span>
          <Button variant="destructive" onClick={() => window.location.href = '/auth/select-plan'}>
            Upgrade Now
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (isExpiringSoon) {
    return (
      <Alert variant="destructive" className="m-4">
        <Clock className="h-4 w-4" />
        <AlertTitle>Trial Ending Soon</AlertTitle>
        <AlertDescription className="flex items-center justify-between">
          <span>Your trial ends in {trialDaysRemaining} day{trialDaysRemaining !== 1 ? 's' : ''}. Upgrade to keep your data.</span>
          <Button variant="default" onClick={() => window.location.href = '/auth/select-plan'}>
            Upgrade Now
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className="m-4 border-primary">
      <Clock className="h-4 w-4 text-primary" />
      <AlertTitle>Free Trial Active</AlertTitle>
      <AlertDescription className="flex items-center justify-between">
        <span>
          You're on a {trialDaysRemaining}-day trial of {currentPlan}. 
          {trialDaysRemaining > 7 && ' Upgrade anytime to unlock all features.'}
        </span>
        <Button variant="outline" onClick={() => window.location.href = '/auth/select-plan'}>
          View Plans
        </Button>
      </AlertDescription>
    </Alert>
  );
}

