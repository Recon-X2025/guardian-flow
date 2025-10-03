import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Shield } from "lucide-react";

interface MFADialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actionType: string;
  onVerified: (tokenId: string) => void;
}

export function MFADialog({ open, onOpenChange, actionType, onVerified }: MFADialogProps) {
  const [step, setStep] = useState<'request' | 'verify'>('request');
  const [tokenId, setTokenId] = useState<string | null>(null);
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [demoToken, setDemoToken] = useState("");
  const { toast } = useToast();

  const requestMFA = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('request-mfa', {
        body: { actionType }
      });

      if (error) throw error;

      setTokenId(data.token_id);
      setDemoToken(data.demo_token); // DEMO ONLY - remove in production
      setStep('verify');

      toast({
        title: "MFA Token Sent",
        description: `DEMO: Your token is ${data.demo_token}`,
        duration: 10000,
      });
    } catch (error: any) {
      toast({
        title: "MFA Request Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const verifyMFA = async () => {
    if (!tokenId || !token) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-mfa', {
        body: { tokenId, token }
      });

      if (error || !data.verified) {
        throw new Error('Invalid or expired token');
      }

      toast({
        title: "MFA Verified",
        description: "Override authorized",
      });

      onVerified(tokenId);
      onOpenChange(false);
      resetDialog();
    } catch (error: any) {
      toast({
        title: "Verification Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetDialog = () => {
    setStep('request');
    setTokenId(null);
    setToken("");
    setDemoToken("");
  };

  return (
    <Dialog open={open} onOpenChange={(open) => {
      onOpenChange(open);
      if (!open) resetDialog();
    }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Multi-Factor Authentication Required
          </DialogTitle>
          <DialogDescription>
            {step === 'request' 
              ? 'This action requires manager-level authorization with MFA verification.'
              : 'Enter the 6-digit code sent to your registered device.'
            }
          </DialogDescription>
        </DialogHeader>

        {step === 'request' ? (
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg space-y-2 text-sm">
              <p><strong>Action Type:</strong> {actionType}</p>
              <p className="text-muted-foreground">
                A verification token will be sent to your registered contact method.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={requestMFA} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Requesting...
                  </>
                ) : (
                  'Request MFA Token'
                )}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            {demoToken && (
              <div className="p-3 bg-yellow-100 border border-yellow-300 rounded text-sm">
                <strong>DEMO MODE:</strong> Your token is <code className="font-mono font-bold">{demoToken}</code>
              </div>
            )}
            <div>
              <label className="text-sm font-medium">Verification Code</label>
              <Input
                type="text"
                placeholder="000000"
                maxLength={6}
                value={token}
                onChange={(e) => setToken(e.target.value.replace(/\D/g, ''))}
                className="text-center text-2xl tracking-widest font-mono mt-2"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('request')}>
                Resend Token
              </Button>
              <Button onClick={verifyMFA} disabled={loading || token.length !== 6}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify & Authorize'
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}