import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function Privacy() {
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
          <h1>Privacy Policy</h1>
          <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>

          <h2>1. Information We Collect</h2>
          <p>
            Guardian Flow collects information that you provide directly to us when you register for an account, use our services, or communicate with us. This includes:
          </p>
          <ul>
            <li>Contact information (name, email, phone number)</li>
            <li>Company information and organizational details</li>
            <li>Account credentials and authentication data</li>
            <li>Service usage data and preferences</li>
            <li>Technical information (IP addresses, browser type, device information)</li>
          </ul>

          <h2>2. How We Use Your Information</h2>
          <p>We use the information we collect to:</p>
          <ul>
            <li>Provide, maintain, and improve our services</li>
            <li>Process transactions and send related information</li>
            <li>Send technical notices and support messages</li>
            <li>Respond to your comments and questions</li>
            <li>Monitor and analyze trends and usage</li>
            <li>Detect, prevent, and address security issues</li>
          </ul>

          <h2>3. Data Security</h2>
          <p>
            We implement appropriate technical and organizational measures to protect your data against unauthorized access, alteration, disclosure, or destruction. This includes:
          </p>
          <ul>
            <li>Encryption of data in transit and at rest</li>
            <li>Regular security assessments and audits</li>
            <li>Access controls and authentication mechanisms</li>
            <li>Employee training on data protection</li>
          </ul>

          <h2>4. Data Sharing and Disclosure</h2>
          <p>
            We do not sell your personal information. We may share your information with third parties only in the following circumstances:
          </p>
          <ul>
            <li>With your consent or at your direction</li>
            <li>With service providers who perform services on our behalf</li>
            <li>To comply with legal obligations</li>
            <li>To protect the rights and safety of Guardian Flow and our users</li>
          </ul>

          <h2>5. Your Rights and Choices</h2>
          <p>You have the right to:</p>
          <ul>
            <li>Access your personal information</li>
            <li>Correct inaccurate data</li>
            <li>Request deletion of your data</li>
            <li>Object to processing of your data</li>
            <li>Export your data in a portable format</li>
          </ul>

          <h2>6. Data Retention</h2>
          <p>
            We retain your information for as long as your account is active or as needed to provide services. We will delete or anonymize your data upon request, unless we are required to retain it for legal purposes.
          </p>

          <h2>7. International Data Transfers</h2>
          <p>
            Your information may be transferred to and processed in countries other than your country of residence. We ensure appropriate safeguards are in place for such transfers.
          </p>

          <h2>8. Changes to This Policy</h2>
          <p>
            We may update this privacy policy from time to time. We will notify you of any material changes by posting the new policy on this page and updating the "Last updated" date.
          </p>

          <h2>9. Contact Us</h2>
          <p>
            If you have questions about this privacy policy, please contact us at:
            <br />
            Email: privacy@guardianflow.com
            <br />
            Address: 123 Enterprise Way, San Francisco, CA 94105
          </p>
        </div>
      </div>
    </div>
  );
}
