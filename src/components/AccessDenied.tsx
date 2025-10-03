import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useRBAC } from "@/contexts/RBACContext";

export function AccessDenied() {
  const navigate = useNavigate();
  const { roles } = useRBAC();

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <ShieldAlert className="h-6 w-6 text-destructive" />
            <CardTitle>Access Denied</CardTitle>
          </div>
          <CardDescription>
            You do not have permission to access this page.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Your current roles: {roles.length > 0 ? roles.map(r => r.role).join(", ") : "None"}
          </p>
          <p className="text-sm text-muted-foreground">
            If you believe you should have access to this resource, please contact your administrator.
          </p>
          <Button onClick={() => navigate("/")} className="w-full">
            Go to Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
