import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

export default function VideoTrainingModule() {
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

      <div className="container py-12 max-w-4xl">
        <h1 className="text-4xl font-bold mb-4">Video Training & Knowledge Base</h1>
        <p className="text-xl text-muted-foreground mb-8">
          Comprehensive training resources and AI-powered knowledge management
        </p>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Business Value</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              Accelerate team onboarding by 60% and reduce support ticket volume by 50% with a comprehensive learning platform that combines video tutorials, documentation, and AI-powered search.
            </p>
            <ul className="space-y-2">
              <li className="flex gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span>Role-based learning paths for technicians, dispatchers, managers, and administrators</span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span>AI-powered knowledge base that suggests relevant articles based on context</span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span>Interactive video tutorials with progress tracking and assessments</span>
              </li>
              <li className="flex gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span>Custom content creation tools for documenting internal processes</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Key Features</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h4 className="font-semibold mb-2">Learning Paths</h4>
              <p className="text-sm text-muted-foreground">
                Structured training curriculum organized by role and skill level, guiding users from basic concepts to advanced features with milestone tracking and certifications.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">AI Knowledge Assistant</h4>
              <p className="text-sm text-muted-foreground">
                Intelligent search that understands natural language queries and provides contextual answers, suggesting relevant articles, videos, and troubleshooting guides.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Video Library</h4>
              <p className="text-sm text-muted-foreground">
                Searchable catalog of screen recordings, feature demos, best practices, and customer success stories with bookmarking and playback speed controls.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Custom Content Management</h4>
              <p className="text-sm text-muted-foreground">
                Create and maintain your own knowledge base articles, upload training videos, and document company-specific procedures with version control.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Use Cases</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-1">New Hire Onboarding</h4>
              <p className="text-sm text-muted-foreground">
                Get new team members productive faster with structured onboarding paths covering platform basics, company processes, and role-specific workflows.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-1">Feature Rollout Training</h4>
              <p className="text-sm text-muted-foreground">
                When introducing new features or process changes, quickly create training materials and track completion rates across your organization.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-1">Self-Service Support</h4>
              <p className="text-sm text-muted-foreground">
                Reduce help desk volume by empowering users to find answers themselves through searchable documentation and troubleshooting guides.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 flex justify-center">
          <Button size="lg" onClick={() => navigate("/auth")}>
            Start Using Training Resources
          </Button>
        </div>
      </div>
    </div>
  );
}
