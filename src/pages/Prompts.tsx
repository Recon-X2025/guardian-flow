import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { 
  FileText, 
  Plus, 
  Edit, 
  Copy, 
  Trash2,
  Save,
  Settings,
  Sparkles
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface PromptTemplate {
  id: string;
  name: string;
  category: string;
  content: string;
  variables: string[];
  usageCount: number;
  lastUsed: string;
}

export default function Prompts() {
  const [prompts, setPrompts] = useState<PromptTemplate[]>([
    {
      id: "prompt_001",
      name: "Work Order Analysis",
      category: "Operations",
      content: "Analyze the following work order and identify any potential issues or anomalies:\n\nWork Order: {{work_order_number}}\nStatus: {{status}}\nCost: {{cost}}\nDuration: {{duration}}\n\nProvide a detailed analysis focusing on cost deviations, timeline issues, and quality concerns.",
      variables: ["work_order_number", "status", "cost", "duration"],
      usageCount: 847,
      lastUsed: "2025-10-07 10:23"
    },
    {
      id: "prompt_002",
      name: "Fraud Detection Reasoning",
      category: "Fraud",
      content: "Review the following transaction data and determine if there are any indicators of fraudulent activity:\n\nTransaction ID: {{transaction_id}}\nAmount: {{amount}}\nTechnician: {{technician_name}}\nPhotos Submitted: {{photo_count}}\nCompletion Time: {{completion_time}}\n\nProvide reasoning and confidence score.",
      variables: ["transaction_id", "amount", "technician_name", "photo_count", "completion_time"],
      usageCount: 523,
      lastUsed: "2025-10-07 09:15"
    },
    {
      id: "prompt_003",
      name: "AI Offer Generation",
      category: "Sales",
      content: "Based on the current work order details, generate personalized upsell offers:\n\nCustomer: {{customer_name}}\nUnit Type: {{unit_type}}\nIssue: {{issue_description}}\nWarranty Status: {{warranty_status}}\n\nGenerate 3 relevant offers with clear value propositions.",
      variables: ["customer_name", "unit_type", "issue_description", "warranty_status"],
      usageCount: 1247,
      lastUsed: "2025-10-07 12:45"
    }
  ]);

  const [selectedPrompt, setSelectedPrompt] = useState<PromptTemplate | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const handleCopyPrompt = (prompt: PromptTemplate) => {
    navigator.clipboard.writeText(prompt.content);
  };

  return (
    <div className="container mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileText className="h-8 w-8" />
            Prompt Templates
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage and optimize AI prompts across the platform
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Prompt
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Prompt Template</DialogTitle>
              <DialogDescription>
                Define a reusable prompt template with variables
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Template Name</label>
                <Input placeholder="e.g., Invoice Review Prompt" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <Input placeholder="e.g., Finance" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Prompt Content</label>
                <Textarea 
                  placeholder="Enter your prompt here. Use {{variable_name}} for dynamic values."
                  className="min-h-[200px]"
                />
                <p className="text-xs text-muted-foreground">
                  Use double curly braces for variables: {`{{variable_name}}`}
                </p>
              </div>
              <Button className="w-full">
                <Save className="h-4 w-4 mr-2" />
                Create Template
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Templates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{prompts.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Active prompts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {prompts.reduce((sum, p) => sum + p.usageCount, 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Prompt invocations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(prompts.map(p => p.category)).size}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Unique categories</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Prompt Library</CardTitle>
          <CardDescription>
            Browse and manage your AI prompt templates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {prompts.map((prompt) => (
              <Card key={prompt.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        {prompt.name}
                        <Badge variant="secondary">{prompt.category}</Badge>
                      </CardTitle>
                      <CardDescription className="mt-1">
                        Used {prompt.usageCount.toLocaleString()} times • Last used: {prompt.lastUsed}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleCopyPrompt(prompt)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm" onClick={() => setSelectedPrompt(prompt)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl">
                          <DialogHeader>
                            <DialogTitle>Edit Prompt: {prompt.name}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Template Name</label>
                              <Input defaultValue={prompt.name} />
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Category</label>
                              <Input defaultValue={prompt.category} />
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Prompt Content</label>
                              <Textarea 
                                defaultValue={prompt.content}
                                className="min-h-[250px] font-mono text-sm"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Variables</label>
                              <div className="flex flex-wrap gap-2">
                                {prompt.variables.map((variable) => (
                                  <Badge key={variable} variant="outline">
                                    {`{{${variable}}}`}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            <Button className="w-full">
                              <Save className="h-4 w-4 mr-2" />
                              Save Changes
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm font-mono whitespace-pre-wrap">
                        {prompt.content.length > 200 
                          ? `${prompt.content.substring(0, 200)}...` 
                          : prompt.content}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Variables:</span>
                      <div className="flex flex-wrap gap-2">
                        {prompt.variables.map((variable) => (
                          <Badge key={variable} variant="secondary" className="text-xs">
                            {`{{${variable}}}`}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
