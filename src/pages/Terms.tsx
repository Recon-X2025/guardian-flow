import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function Terms() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Button onClick={() => navigate("/auth")}>Get Started</Button>
        </div>
      </header>

      <div className="container py-12">
        <div className="max-w-4xl mx-auto prose prose-slate dark:prose-invert">
          <h1>Terms of Service</h1>
          <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>

          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing or using Guardian Flow's services, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using our services.
          </p>

          <h2>2. Description of Service</h2>
          <p>
            Guardian Flow provides an enterprise field service management platform that includes work order management, asset lifecycle tracking, AI-powered forecasting, and related services. We reserve the right to modify, suspend, or discontinue any aspect of the service at any time.
          </p>

          <h2>3. User Accounts</h2>
          <p>
            To access certain features of our service, you must register for an account. You agree to:
          </p>
          <ul>
            <li>Provide accurate, current, and complete information</li>
            <li>Maintain and update your account information</li>
            <li>Maintain the security of your account credentials</li>
            <li>Notify us immediately of any unauthorized access</li>
            <li>Accept responsibility for all activities under your account</li>
          </ul>

          <h2>4. Acceptable Use</h2>
          <p>You agree not to:</p>
          <ul>
            <li>Use the service for any illegal purpose</li>
            <li>Attempt to gain unauthorized access to any part of the service</li>
            <li>Interfere with or disrupt the service or servers</li>
            <li>Upload malicious code or viruses</li>
            <li>Reverse engineer or attempt to extract source code</li>
            <li>Use the service to transmit spam or unsolicited messages</li>
          </ul>

          <h2>5. Intellectual Property</h2>
          <p>
            The service and its original content, features, and functionality are owned by Guardian Flow and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.
          </p>

          <h2>6. User Content</h2>
          <p>
            You retain ownership of any content you submit to the service. By submitting content, you grant Guardian Flow a worldwide, non-exclusive license to use, reproduce, and display such content solely for the purpose of providing the service.
          </p>

          <h2>7. Payment Terms</h2>
          <p>
            Paid services are billed in advance on a recurring basis (monthly, quarterly, or annually). You agree to pay all fees according to your chosen pricing plan. We reserve the right to change our pricing with 30 days' notice.
          </p>

          <h2>8. Service Level Agreement</h2>
          <p>
            We strive to maintain 99.9% uptime for our services. Scheduled maintenance will be communicated in advance. In the event of extended downtime, service credits may be provided according to our SLA terms.
          </p>

          <h2>9. Limitation of Liability</h2>
          <p>
            Guardian Flow shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the service. Our total liability shall not exceed the amount paid by you in the twelve months preceding the claim.
          </p>

          <h2>10. Indemnification</h2>
          <p>
            You agree to indemnify and hold Guardian Flow harmless from any claims, losses, damages, liabilities, and expenses arising from your use of the service or violation of these terms.
          </p>

          <h2>11. Termination</h2>
          <p>
            We may terminate or suspend your account at any time for violation of these terms. Upon termination, your right to use the service will immediately cease. You may cancel your account at any time through your account settings.
          </p>

          <h2>12. Governing Law</h2>
          <p>
            These terms shall be governed by and construed in accordance with the laws of the State of California, without regard to its conflict of law provisions.
          </p>

          <h2>13. Changes to Terms</h2>
          <p>
            We reserve the right to modify these terms at any time. We will notify users of material changes via email or through the service. Continued use of the service after such modifications constitutes acceptance of the updated terms.
          </p>

          <h2>14. Contact Information</h2>
          <p>
            For questions about these Terms of Service, please contact us at:
            <br />
            Email: legal@guardianflow.com
            <br />
            Address: 123 Enterprise Way, San Francisco, CA 94105
          </p>
        </div>
      </div>
    </div>
  );
}
