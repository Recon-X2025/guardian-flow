import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, AlertTriangle, CheckCircle2, Clock, DollarSign, Package, Users, Wrench } from "lucide-react";

export default function Dashboard() {
  const stats = [
    {
      title: "Active Work Orders",
      value: "24",
      change: "+12%",
      icon: Wrench,
      color: "text-primary",
    },
    {
      title: "Pending Tickets",
      value: "8",
      change: "-5%",
      icon: Clock,
      color: "text-warning",
    },
    {
      title: "Parts in Stock",
      value: "1,247",
      change: "+8%",
      icon: Package,
      color: "text-success",
    },
    {
      title: "Revenue (MTD)",
      value: "$127.5K",
      change: "+23%",
      icon: DollarSign,
      color: "text-accent",
    },
  ];

  const recentActivity = [
    {
      id: "WO-2024-001",
      title: "HVAC Unit Repair",
      status: "In Progress",
      tech: "John Smith",
      time: "2 hours ago",
    },
    {
      id: "WO-2024-002",
      title: "Electrical Panel Replacement",
      status: "Awaiting Photos",
      tech: "Sarah Johnson",
      time: "4 hours ago",
    },
    {
      id: "WO-2024-003",
      title: "Plumbing Maintenance",
      status: "Completed",
      tech: "Mike Davis",
      time: "6 hours ago",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Welcome to ReconX AI Field Service Platform</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                <span className={stat.change.startsWith("+") ? "text-success" : "text-destructive"}>
                  {stat.change}
                </span>{" "}
                from last month
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Work Orders</CardTitle>
            <CardDescription>Latest field service activities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold">{activity.id}</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          activity.status === "Completed"
                            ? "bg-success/10 text-success"
                            : activity.status === "In Progress"
                            ? "bg-primary/10 text-primary"
                            : "bg-warning/10 text-warning"
                        }`}
                      >
                        {activity.status}
                      </span>
                    </div>
                    <p className="text-sm text-foreground">{activity.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {activity.tech} • {activity.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Alerts</CardTitle>
            <CardDescription>Requires attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 border border-warning/20 bg-warning/5 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-warning mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Low Stock Alert</p>
                  <p className="text-xs text-muted-foreground">
                    3 parts below minimum threshold
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 border border-primary/20 bg-primary/5 rounded-lg">
                <Activity className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="text-sm font-medium">SLA Risk</p>
                  <p className="text-xs text-muted-foreground">
                    2 work orders approaching deadline
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 border border-success/20 bg-success/5 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-success mt-0.5" />
                <div>
                  <p className="text-sm font-medium">All Systems Operational</p>
                  <p className="text-xs text-muted-foreground">
                    No critical issues detected
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-gradient-to-br from-primary/10 via-accent/10 to-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Platform Features
          </CardTitle>
          <CardDescription>87 integrated modules for complete field service management</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3">
              <div className="text-2xl font-bold text-primary mb-1">87</div>
              <div className="text-xs text-muted-foreground">Total Modules</div>
            </div>
            <div className="text-center p-3">
              <div className="text-2xl font-bold text-accent mb-1">24/7</div>
              <div className="text-xs text-muted-foreground">AI Support</div>
            </div>
            <div className="text-center p-3">
              <div className="text-2xl font-bold text-success mb-1">99.9%</div>
              <div className="text-xs text-muted-foreground">Uptime</div>
            </div>
            <div className="text-center p-3">
              <div className="text-2xl font-bold text-warning mb-1">Real-time</div>
              <div className="text-xs text-muted-foreground">Analytics</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
