import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { TrendingUp, TrendingDown, Users, Wrench, DollarSign, Cloud, Calendar, RefreshCw } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';

export default function ForecastCenter() {
  const [forecasts, setForecasts] = useState<any>({
    engineer_shrinkage: [],
    repair_volume: [],
    spend_revenue: []
  });
  const [models, setModels] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [externalData, setExternalData] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadForecasts();
    loadModels();
    loadExternalData();
  }, []);

  const loadForecasts = async () => {
    try {
      const { data, error } = await supabase
        .from('forecast_outputs')
        .select('*')
        .gte('target_date', new Date().toISOString().split('T')[0])
        .order('target_date', { ascending: true })
        .limit(90);

      if (error) throw error;

      const grouped = {
        engineer_shrinkage: data?.filter(f => f.forecast_type === 'engineer_shrinkage') || [],
        repair_volume: data?.filter(f => f.forecast_type === 'repair_volume') || [],
        spend_revenue: data?.filter(f => f.forecast_type === 'spend_revenue') || []
      };

      setForecasts(grouped);
    } catch (error: any) {
      console.error('Error loading forecasts:', error);
    }
  };

  const loadModels = async () => {
    try {
      const { data, error } = await supabase
        .from('forecast_models')
        .select('*')
        .eq('active', true);

      if (error) throw error;
      setModels(data || []);
    } catch (error: any) {
      console.error('Error loading models:', error);
    }
  };

  const loadExternalData = async () => {
    try {
      const { data, error } = await supabase
        .from('external_data_feeds')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setExternalData(data);
    } catch (error: any) {
      console.error('Error loading external data:', error);
    }
  };

  const generateForecast = async (type: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('forecast-engine', {
        body: { forecast_type: type, days_ahead: 30 }
      });

      if (error) throw error;

      // Handle async job acceptance (202) or sync completion (200)
      if (data?.status === 'accepted') {
        toast({
          title: "Forecast Job Queued",
          description: `Job ${data.jobId} is processing. Results will appear shortly.`,
        });
        
        // Poll for completion after 5 seconds
        setTimeout(() => loadForecasts(), 5000);
      } else if (data?.success) {
        toast({
          title: "Forecast Generated",
          description: `Successfully generated ${type} forecast`,
        });
      } else if (data?.fallback) {
        toast({
          title: "Fallback Used",
          description: data.message || "Using heuristic forecast",
          variant: "default"
        });
      }

      await loadForecasts();
    } catch (error: any) {
      toast({
        title: "Forecast Error",
        description: error.message || "Failed to generate forecast",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const syncExternalData = async (feedType: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('external-data-sync', {
        body: { feed_type: feedType, region: 'US' }
      });

      if (error) throw error;

      toast({
        title: "Data Synced",
        description: `${feedType} data updated successfully`
      });

      await loadExternalData();
    } catch (error: any) {
      toast({
        title: "Sync Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const formatChartData = (data: any[]) => {
    return data.map(d => ({
      date: new Date(d.target_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: Number(d.value),
      lower: Number(d.confidence_lower || d.value * 0.8),
      upper: Number(d.confidence_upper || d.value * 1.2)
    }));
  };

  const calculateTrend = (data: any[]) => {
    if (data.length < 2) return 0;
    const first = Number(data[0].value);
    const last = Number(data[data.length - 1].value);
    return ((last - first) / first * 100).toFixed(1);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Forecast Center</h1>
          <p className="text-muted-foreground">
            AI-powered predictive analytics for operations, finance, and resources
          </p>
        </div>
        <Button onClick={() => window.location.reload()} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Models</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{models.length}</div>
            <p className="text-xs text-muted-foreground">
              Forecasting engines running
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Engineer Availability</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {forecasts.engineer_shrinkage[0]?.value || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              <Badge variant={Number(calculateTrend(forecasts.engineer_shrinkage)) > 0 ? "default" : "destructive"}>
                {calculateTrend(forecasts.engineer_shrinkage)}%
              </Badge>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Repair Volume</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {forecasts.repair_volume[0]?.value || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              <Badge variant={Number(calculateTrend(forecasts.repair_volume)) > 0 ? "destructive" : "default"}>
                {calculateTrend(forecasts.repair_volume)}%
              </Badge>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue Forecast</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(forecasts.spend_revenue[0]?.value || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              <Badge variant={Number(calculateTrend(forecasts.spend_revenue)) > 0 ? "default" : "destructive"}>
                {calculateTrend(forecasts.spend_revenue)}%
              </Badge>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Forecasts Tabs */}
      <Tabs defaultValue="volume" className="space-y-4">
        <TabsList>
          <TabsTrigger value="volume">Repair Volume</TabsTrigger>
          <TabsTrigger value="engineers">Engineer Capacity</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="external">External Data</TabsTrigger>
        </TabsList>

        <TabsContent value="volume" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Repair Volume Forecast</CardTitle>
                  <CardDescription>30-day prediction with confidence intervals</CardDescription>
                </div>
                <Button onClick={() => generateForecast('repair_volume')} disabled={loading}>
                  Generate Forecast
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {forecasts.repair_volume.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={formatChartData(forecasts.repair_volume)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="lower" stackId="1" stroke="#8884d8" fill="#8884d8" fillOpacity={0.2} name="Lower Bound" />
                    <Area type="monotone" dataKey="value" stackId="2" stroke="#82ca9d" fill="#82ca9d" name="Forecast" />
                    <Area type="monotone" dataKey="upper" stackId="3" stroke="#ffc658" fill="#ffc658" fillOpacity={0.2} name="Upper Bound" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  No forecast data available. Click "Generate Forecast" to create predictions.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="engineers" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Engineer Availability Forecast</CardTitle>
                  <CardDescription>Predicted staffing levels and shrinkage</CardDescription>
                </div>
                <Button onClick={() => generateForecast('engineer_shrinkage')} disabled={loading}>
                  Generate Forecast
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {forecasts.engineer_shrinkage.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={formatChartData(forecasts.engineer_shrinkage)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="value" stroke="#8884d8" name="Available Engineers" />
                    <Line type="monotone" dataKey="lower" stroke="#ff7c7c" strokeDasharray="5 5" name="Minimum" />
                    <Line type="monotone" dataKey="upper" stroke="#82ca9d" strokeDasharray="5 5" name="Maximum" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  No forecast data available. Click "Generate Forecast" to create predictions.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financial" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Spend & Revenue Forecast</CardTitle>
                  <CardDescription>Financial projections and cash flow</CardDescription>
                </div>
                <Button onClick={() => generateForecast('spend_revenue')} disabled={loading}>
                  Generate Forecast
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {forecasts.spend_revenue.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={formatChartData(forecasts.spend_revenue)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value) => `$${Number(value).toLocaleString()}`} />
                    <Legend />
                    <Area type="monotone" dataKey="value" stroke="#82ca9d" fill="#82ca9d" name="Revenue" />
                    <Area type="monotone" dataKey="lower" stroke="#ff7c7c" fill="#ff7c7c" fillOpacity={0.3} name="Conservative" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  No forecast data available. Click "Generate Forecast" to create predictions.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="external" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cloud className="h-5 w-5" />
                  Weather Data
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button onClick={() => syncExternalData('weather')} className="w-full">
                  Sync Weather
                </Button>
                {externalData?.feed_type === 'weather' && (
                  <div className="mt-4 text-sm text-muted-foreground">
                    Last updated: {new Date(externalData.created_at).toLocaleString()}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Public Events
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button onClick={() => syncExternalData('events')} className="w-full">
                  Sync Events
                </Button>
                {externalData?.feed_type === 'events' && (
                  <div className="mt-4 text-sm text-muted-foreground">
                    Last updated: {new Date(externalData.created_at).toLocaleString()}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Economic Data
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Button onClick={() => syncExternalData('economic')} className="w-full">
                  Sync Indicators
                </Button>
                {externalData?.feed_type === 'economic' && (
                  <div className="mt-4 text-sm text-muted-foreground">
                    Last updated: {new Date(externalData.created_at).toLocaleString()}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Model Registry */}
      <Card>
        <CardHeader>
          <CardTitle>Active Forecast Models</CardTitle>
          <CardDescription>ML models powering the prediction engine</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {models.map(model => (
              <div key={model.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-semibold">{model.model_name}</h4>
                  <p className="text-sm text-muted-foreground">
                    {model.algorithm} • {model.frequency} • Accuracy: {model.accuracy_score || 'N/A'}%
                  </p>
                </div>
                <Badge>{model.model_type}</Badge>
              </div>
            ))}
            {models.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No active models configured
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}