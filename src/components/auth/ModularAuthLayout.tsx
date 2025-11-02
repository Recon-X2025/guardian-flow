import { ReactNode, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AuthBrandingConfig } from "@/config/authConfig";
import { Shield, Info, HelpCircle, Mail, Phone } from "lucide-react";
import { logAuthEvent } from "@/hooks/useAuthAudit";
import TestAccountSelector from "./TestAccountSelector";

type ModularAuthLayoutProps = {
  config: AuthBrandingConfig;
  children: ReactNode;
  whiteLabel?: {
    logoUrl?: string;
    companyName?: string;
  };
  onTestAccountLogin?: () => void;
};

export default function ModularAuthLayout({ config, children, whiteLabel, onTestAccountLogin }: ModularAuthLayoutProps) {
  const Icon = config.icon;

  // SEO metadata and audit logging (non-PII)
  useEffect(() => {
    try {
      document.title = `${config.name} – Sign In | Guardian Flow`;
      const desc = config.description || `${config.name} authentication`;
      let metaDesc = document.querySelector('meta[name="description"]');
      if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.setAttribute('name', 'description');
        document.head.appendChild(metaDesc);
      }
      metaDesc.setAttribute('content', desc);

      let linkCanonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
      if (!linkCanonical) {
        linkCanonical = document.createElement('link');
        linkCanonical.rel = 'canonical';
        document.head.appendChild(linkCanonical);
      }
      linkCanonical.href = window.location.href;

      logAuthEvent("auth_page_view", config.module);
    } catch (_) {
      // no-op
    }
  }, [config]);
  
  return (
    <div className={`min-h-screen bg-gradient-to-br ${config.gradientFrom} ${config.gradientTo} flex items-center justify-center p-4`}>
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* Hero Section */}
        <div className="text-white space-y-6 p-8">
          <div className="flex items-center gap-4">
            {whiteLabel?.logoUrl ? (
              <img 
                src={whiteLabel.logoUrl} 
                alt="Logo" 
                className="w-16 h-16 object-contain"
              />
            ) : (
              <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                <Icon className="w-10 h-10" />
              </div>
            )}
            <div>
              <h1 className="text-4xl font-bold">
                {whiteLabel?.companyName || config.name}
              </h1>
              <Badge variant="secondary" className="mt-2 bg-white/20 text-white border-white/30">
                {config.tagline}
              </Badge>
            </div>
          </div>
          
          <p className="text-xl text-white/90 leading-relaxed">
            {config.description}
          </p>
          
          {/* Feature Highlights */}
          <div className="grid grid-cols-2 gap-4 mt-8">
            {config.allowSSO && (
              <div className="flex items-center gap-2 text-white/80">
                <Shield className="w-5 h-5" />
                <span className="text-sm">Enterprise SSO</span>
              </div>
            )}
            {config.allowMFA && (
              <div className="flex items-center gap-2 text-white/80">
                <Shield className="w-5 h-5" />
                <span className="text-sm">Multi-Factor Auth</span>
              </div>
            )}
            {config.allowPasswordless && (
              <div className="flex items-center gap-2 text-white/80">
                <Shield className="w-5 h-5" />
                <span className="text-sm">Passwordless Login</span>
              </div>
            )}
          </div>
          
          {/* Support Information */}
          <div className="mt-8 space-y-2">
            {config.supportEmail && (
              <div className="flex items-center gap-2 text-white/70 text-sm">
                <Mail className="w-4 h-4" />
                <a href={`mailto:${config.supportEmail}`} className="hover:text-white transition-colors">
                  {config.supportEmail}
                </a>
              </div>
            )}
            {config.supportPhone && (
              <div className="flex items-center gap-2 text-white/70 text-sm">
                <Phone className="w-4 h-4" />
                <a href={`tel:${config.supportPhone}`} className="hover:text-white transition-colors">
                  {config.supportPhone}
                </a>
              </div>
            )}
            {config.helpUrl && (
              <div className="flex items-center gap-2 text-white/70 text-sm">
                <HelpCircle className="w-4 h-4" />
                <a 
                  href={config.helpUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  Help & Documentation
                </a>
              </div>
            )}
          </div>
        </div>
        
        {/* Auth Form Section */}
        <Card className="w-full max-w-md mx-auto shadow-2xl">
          <CardHeader>
            <CardTitle className="text-2xl">Sign In</CardTitle>
            <CardDescription>
              Access your {config.name} account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {config.complianceMessage && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  {config.complianceMessage}
                </AlertDescription>
              </Alert>
            )}
            
            {children}
            
            {/* Test Account Selector (development only) */}
            <TestAccountSelector onLogin={onTestAccountLogin} moduleId={config.module} />
            
            {config.legalNotice && (
              <p className="text-xs text-center text-muted-foreground mt-4">
                {config.legalNotice}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
