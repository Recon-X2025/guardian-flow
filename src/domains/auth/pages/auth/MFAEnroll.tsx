import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Shield, ShieldCheck, Smartphone, Copy, CheckCircle2, AlertCircle } from 'lucide-react';
import { apiClient } from '@/integrations/api/client';
import { useToast } from '@/domains/shared/hooks/use-toast';

type Step = 'intro' | 'qr' | 'verify' | 'backup';

interface EnrollData {
  qrCodeUrl: string;
  otpauthUri: string;
}

interface VerifyData {
  backupCodes: string[];
}

export default function MFAEnroll() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [step, setStep] = useState<Step>('intro');
  const [enrolling, setEnrolling] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [enrollData, setEnrollData] = useState<EnrollData | null>(null);
  const [verifyData, setVerifyData] = useState<VerifyData | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [copiedUri, setCopiedUri] = useState(false);

  const beginSetup = async () => {
    setEnrolling(true);
    try {
      const res = await apiClient.request<EnrollData>('/api/auth/mfa/enroll', { method: 'POST' });
      if (res.error) throw new Error(res.error.message);
      if (!res.data) throw new Error('No enrollment data returned');
      setEnrollData(res.data);
      setStep('qr');
    } catch (err: unknown) {
      toast({
        title: 'Enrollment failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setEnrolling(false);
    }
  };

  const submitVerify = async () => {
    if (otpCode.length !== 6 || !/^\d{6}$/.test(otpCode)) {
      toast({ title: 'Enter a valid 6-digit code', variant: 'destructive' });
      return;
    }
    setVerifying(true);
    try {
      const res = await apiClient.request<VerifyData>('/api/auth/mfa/verify-enroll', {
        method: 'POST',
        body: JSON.stringify({ code: otpCode }),
      });
      if (res.error) throw new Error(res.error.message);
      setVerifyData(res.data ?? { backupCodes: [] });
      setStep('backup');
    } catch (err: unknown) {
      toast({
        title: 'Verification failed',
        description: err instanceof Error ? err.message : 'Invalid code. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setVerifying(false);
    }
  };

  const copyUri = async () => {
    if (!enrollData?.otpauthUri) return;
    await navigator.clipboard.writeText(enrollData.otpauthUri);
    setCopiedUri(true);
    setTimeout(() => setCopiedUri(false), 2000);
  };

  const stepNumber = { intro: 1, qr: 2, verify: 3, backup: 4 }[step];

  return (
    <div className="max-w-lg mx-auto py-10 px-4 space-y-6">
      {/* Header */}
      <div className="text-center space-y-1">
        <div className="flex justify-center mb-3">
          <div className="p-3 rounded-full bg-primary/10">
            <Shield className="h-8 w-8 text-primary" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-foreground">Two-Factor Authentication</h1>
        <p className="text-muted-foreground text-sm">
          Protect your account with an authenticator app
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 text-sm">
        {[1, 2, 3, 4].map((n) => (
          <div key={n} className="flex items-center gap-2">
            <div
              className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                n < stepNumber
                  ? 'bg-primary text-primary-foreground'
                  : n === stepNumber
                  ? 'bg-primary text-primary-foreground ring-2 ring-primary/30'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {n < stepNumber ? <CheckCircle2 className="h-4 w-4" /> : n}
            </div>
            {n < 4 && <div className={`h-px w-6 ${n < stepNumber ? 'bg-primary' : 'bg-border'}`} />}
          </div>
        ))}
      </div>

      {/* Step: Intro */}
      {step === 'intro' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Enable Two-Factor Authentication
            </CardTitle>
            <CardDescription>
              You'll need an authenticator app such as Google Authenticator or Authy installed on
              your phone.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2 text-sm text-muted-foreground list-none">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                Scan a QR code with your authenticator app
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                Enter the 6-digit code to confirm setup
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                Save your backup codes in a secure location
              </li>
            </ul>
            <Button className="w-full" onClick={beginSetup} disabled={enrolling}>
              {enrolling ? 'Preparing…' : 'Begin Setup'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step: QR code */}
      {step === 'qr' && enrollData && (
        <Card>
          <CardHeader>
            <CardTitle>Scan the QR Code</CardTitle>
            <CardDescription>
              Open your authenticator app, tap "Add account", then scan the code below.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center p-4 bg-white rounded-lg border">
              <img
                src={enrollData.qrCodeUrl}
                alt="MFA QR code"
                className="h-48 w-48 object-contain"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                Can't scan? Copy the setup key manually:
              </Label>
              <div className="flex gap-2 items-center">
                <code className="flex-1 text-xs bg-muted p-2 rounded break-all">
                  {enrollData.otpauthUri}
                </code>
                <Button variant="outline" size="icon" onClick={copyUri} aria-label="Copy URI">
                  {copiedUri ? (
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <Button className="w-full" onClick={() => setStep('verify')}>
              I've scanned the code — Next
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step: Verify */}
      {step === 'verify' && (
        <Card>
          <CardHeader>
            <CardTitle>Enter Verification Code</CardTitle>
            <CardDescription>
              Open your authenticator app and enter the 6-digit code shown for this account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="otp-code">Authentication Code</Label>
              <Input
                id="otp-code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                placeholder="000000"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="text-center text-xl tracking-widest font-mono"
                autoFocus
              />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep('qr')}>
                Back
              </Button>
              <Button
                className="flex-1"
                onClick={submitVerify}
                disabled={verifying || otpCode.length !== 6}
              >
                {verifying ? 'Verifying…' : 'Verify'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step: Backup codes */}
      {step === 'backup' && verifyData && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <ShieldCheck className="h-5 w-5" />
              MFA Enabled Successfully
            </CardTitle>
            <CardDescription>
              Save these backup codes in a secure place. Each code can only be used once if you
              lose access to your authenticator app.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {verifyData.backupCodes.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {verifyData.backupCodes.map((code, i) => (
                  <div
                    key={i}
                    className="font-mono text-sm bg-background border rounded px-3 py-1.5 text-center tracking-widest"
                  >
                    {code}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted rounded p-3">
                <AlertCircle className="h-4 w-4 shrink-0" />
                No backup codes were returned. Contact your administrator.
              </div>
            )}

            <div className="flex items-center gap-2 p-3 border rounded-lg bg-background">
              <input
                type="checkbox"
                id="codes-saved"
                className="h-4 w-4 accent-primary"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
              />
              <label htmlFor="codes-saved" className="text-sm cursor-pointer">
                I have saved these backup codes in a secure location
              </label>
            </div>

            <Button
              className="w-full"
              disabled={!confirmed}
              onClick={() => navigate('/settings')}
            >
              Done — Go to Settings
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
