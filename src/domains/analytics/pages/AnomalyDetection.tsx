import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Activity,
  AlertTriangle,
  TrendingUp,
  Clock,
  MapPin,
  Camera,
  Package,
  DollarSign,
  Eye,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface Anomaly {
  id: string;
  type: string;
  severity: "high" | "medium" | "low";
  description: string;
  entity: string;
  entityId: string;
  detectedAt: string;
  confidence: number;
  status: "open" | "investigating" | "resolved" | "false_positive";
  details: {
    expected: string;
    actual: string;
    deviation: string;
  };
}

const mockAnomalies: Anomaly[] = [
  {
    id: "1",
    type: "Photo Quality",
    severity: "high",
    description: "Multiple low-quality photos submitted for WO-2024-1234",
    entity: "Work Order",
    entityId: "WO-2024-1234",
    detectedAt: "2024-01-06T10:30:00Z",
    confidence: 92,
    status: "open",
    details: {
      expected: "Clear, well-lit photos",
      actual: "Blurry, poorly lit images",
      deviation: "Quality score < 40%",
    },
  },
  {
    id: "2",
    type: "Completion Time",
    severity: "medium",
    description: "WO completed in unusually short time (15 minutes)",
    entity: "Work Order",
    entityId: "WO-2024-1189",
    detectedAt: "2024-01-06T09:15:00Z",
    confidence: 87,
    status: "investigating",
    details: {
      expected: "Avg 2-4 hours",
      actual: "15 minutes",
      deviation: "95% faster than average",
    },
  },
  {
    id: "3",
    type: "GPS Location",
    severity: "high",
    description: "Work order completed outside service area",
    entity: "Work Order",
    entityId: "WO-2024-1156",
    detectedAt: "2024-01-06T08:45:00Z",
    confidence: 95,
    status: "open",
    details: {
      expected: "Within 50km of site",
      actual: "230km away",
      deviation: "360% outside range",
    },
  },
  {
    id: "4",
    type: "Part Usage",
    severity: "medium",
    description: "High frequency of buffer stock consumption by technician",
    entity: "Technician",
    entityId: "TECH-456",
    detectedAt: "2024-01-06T07:20:00Z",
    confidence: 78,
    status: "investigating",
    details: {
      expected: "2-3 per month",
      actual: "12 in last week",
      deviation: "400% increase",
    },
  },
  {
    id: "5",
    type: "Invoice Amount",
    severity: "low",
    description: "Invoice total exceeds quote by significant margin",
    entity: "Invoice",
    entityId: "INV-2024-0089",
    detectedAt: "2024-01-05T16:30:00Z",
    confidence: 82,
    status: "resolved",
    details: {
      expected: "$450 (quoted)",
      actual: "$720",
      deviation: "+60% over quote",
    },
  },
];

const anomalyStats = {
  total: 47,
  open: 23,
  investigating: 12,
  resolved: 10,
  falsePositive: 2,
  highSeverity: 8,
  mediumSeverity: 15,
  lowSeverity: 24,
};

export default function AnomalyDetection() {
  const [selectedAnomaly, setSelectedAnomaly] = useState<Anomaly | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "bg-destructive/10 text-destructive border-destructive/20";
      case "medium":
        return "bg-warning/10 text-warning border-warning/20";
      case "low":
        return "bg-muted text-muted-foreground border-muted-foreground/20";
      default:
        return "bg-muted";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "bg-destructive/10 text-destructive border-destructive/20";
      case "investigating":
        return "bg-warning/10 text-warning border-warning/20";
      case "resolved":
        return "bg-success/10 text-success border-success/20";
      case "false_positive":
        return "bg-muted text-muted-foreground border-muted-foreground/20";
      default:
        return "bg-muted";
    }
  };

  const getAnomalyIcon = (type: string) => {
    switch (type) {
      case "Photo Quality":
        return Camera;
      case "Completion Time":
        return Clock;
      case "GPS Location":
        return MapPin;
      case "Part Usage":
        return Package;
      case "Invoice Amount":
        return DollarSign;
      default:
        return Activity;
    }
  };

  const filteredAnomalies = filterStatus === "all" 
    ? mockAnomalies 
    : mockAnomalies.filter(a => a.status === filterStatus);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Anomaly Detection</h1>
          <p className="text-muted-foreground">AI-powered detection of unusual patterns and behaviors</p>
        </div>
        <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
          <AlertTriangle className="h-3 w-3 mr-1" />
          {anomalyStats.open} Open
        </Badge>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Anomalies</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{anomalyStats.total}</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Cases</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{anomalyStats.open}</div>
            <p className="text-xs text-muted-foreground">Requiring attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Under Investigation</CardTitle>
            <Eye className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{anomalyStats.investigating}</div>
            <p className="text-xs text-muted-foreground">Being reviewed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Severity</CardTitle>
            <TrendingUp className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{anomalyStats.highSeverity}</div>
            <p className="text-xs text-muted-foreground">Critical issues</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all" className="space-y-4" onValueChange={setFilterStatus}>
        <TabsList>
          <TabsTrigger value="all">All Anomalies</TabsTrigger>
          <TabsTrigger value="open">Open</TabsTrigger>
          <TabsTrigger value="investigating">Investigating</TabsTrigger>
          <TabsTrigger value="resolved">Resolved</TabsTrigger>
        </TabsList>

        <TabsContent value={filterStatus} className="space-y-4">
          <div className="grid gap-4">
            {filteredAnomalies.map((anomaly) => {
              const Icon = getAnomalyIcon(anomaly.type);
              return (
                <Card 
                  key={anomaly.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setSelectedAnomaly(anomaly)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${getSeverityColor(anomaly.severity)}`}>
                          <Icon className="h-6 w-6" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <CardTitle className="text-lg">{anomaly.type}</CardTitle>
                            <Badge variant="outline" className={getSeverityColor(anomaly.severity)}>
                              {anomaly.severity}
                            </Badge>
                            <Badge variant="outline" className={getStatusColor(anomaly.status)}>
                              {anomaly.status.replace(/_/g, " ")}
                            </Badge>
                          </div>
                          <CardDescription className="text-sm">{anomaly.description}</CardDescription>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span>{anomaly.entity}: {anomaly.entityId}</span>
                            <span>•</span>
                            <span>{new Date(anomaly.detectedAt).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-primary">{anomaly.confidence}%</div>
                        <div className="text-xs text-muted-foreground">Confidence</div>
                      </div>
                    </div>
                  </CardHeader>
                  {selectedAnomaly?.id === anomaly.id && (
                    <CardContent className="pt-0">
                      <div className="border-t pt-4 space-y-3">
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Expected</p>
                            <p className="text-sm font-medium">{anomaly.details.expected}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Actual</p>
                            <p className="text-sm font-medium text-destructive">{anomaly.details.actual}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Deviation</p>
                            <p className="text-sm font-medium text-warning">{anomaly.details.deviation}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 pt-2">
                          <div className="flex-1">
                            <div className="text-xs text-muted-foreground mb-1">Confidence Score</div>
                            <Progress value={anomaly.confidence} className="h-2" />
                          </div>
                        </div>
                        <div className="flex gap-2 pt-2">
                          <Button size="sm" variant="outline" className="gap-2">
                            <Eye className="h-4 w-4" />
                            Investigate
                          </Button>
                          <Button size="sm" variant="outline" className="gap-2">
                            <CheckCircle className="h-4 w-4" />
                            Mark Resolved
                          </Button>
                          <Button size="sm" variant="outline" className="gap-2">
                            <XCircle className="h-4 w-4" />
                            False Positive
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle>Detection Models</CardTitle>
          <CardDescription>AI models actively monitoring for anomalies</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <Camera className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium text-sm">Photo Quality Validator</p>
                  <p className="text-xs text-muted-foreground">Detects low-quality or manipulated images</p>
                </div>
              </div>
              <Badge variant="outline" className="bg-success/10 text-success border-success/20">Active</Badge>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium text-sm">Time Pattern Analyzer</p>
                  <p className="text-xs text-muted-foreground">Flags unusual completion times</p>
                </div>
              </div>
              <Badge variant="outline" className="bg-success/10 text-success border-success/20">Active</Badge>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium text-sm">GPS Location Monitor</p>
                  <p className="text-xs text-muted-foreground">Validates work location accuracy</p>
                </div>
              </div>
              <Badge variant="outline" className="bg-success/10 text-success border-success/20">Active</Badge>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <Package className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium text-sm">Parts Usage Analyzer</p>
                  <p className="text-xs text-muted-foreground">Tracks unusual consumption patterns</p>
                </div>
              </div>
              <Badge variant="outline" className="bg-success/10 text-success border-success/20">Active</Badge>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <DollarSign className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium text-sm">Financial Outlier Detector</p>
                  <p className="text-xs text-muted-foreground">Identifies billing anomalies</p>
                </div>
              </div>
              <Badge variant="outline" className="bg-success/10 text-success border-success/20">Active</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
