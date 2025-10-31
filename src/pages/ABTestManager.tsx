import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Users, DollarSign, Activity } from 'lucide-react';

export default function ABTestManager() {
  const [selectedExperiment, setSelectedExperiment] = useState<string | null>(null);

  const { data: experiments } = useQuery({
    queryKey: ['ab-experiments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ab_test_experiments')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: results } = useQuery({
    queryKey: ['ab-results', selectedExperiment],
    queryFn: async () => {
      if (!selectedExperiment) return null;
      const { data, error } = await supabase.functions.invoke('ab-test-manager', {
        body: { action: 'get_results', experiment_id: selectedExperiment },
      });
      if (error) throw error;
      return data.stats;
    },
    enabled: !!selectedExperiment,
  });

  const formatResultsForChart = (stats: any) => {
    if (!stats) return [];
    return Object.entries(stats).map(([variant, data]: [string, any]) => ({
      variant,
      conversions: data.conversions,
      rate: data.conversion_rate,
      value: data.avg_value,
    }));
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">A/B Test Manager</h1>
        <p className="text-muted-foreground">Monitor and analyze experiments</p>
      </div>

      <div className="grid gap-6">
        {experiments?.map((exp) => (
          <Card key={exp.id} className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setSelectedExperiment(exp.id)}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{exp.name}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">{exp.description}</p>
                </div>
                <Badge variant={exp.status === 'running' ? 'default' : 'secondary'}>
                  {exp.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Variants
                  </p>
                  <p className="text-2xl font-bold">{exp.variants?.length || 0}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Started
                  </p>
                  <p className="text-sm">{new Date(exp.start_date).toLocaleDateString()}</p>
                </div>
                {exp.end_date && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Ends</p>
                    <p className="text-sm">{new Date(exp.end_date).toLocaleDateString()}</p>
                  </div>
                )}
              </div>

              {selectedExperiment === exp.id && results && (
                <div className="mt-6 space-y-4">
                  <Tabs defaultValue="chart">
                    <TabsList>
                      <TabsTrigger value="chart">Chart</TabsTrigger>
                      <TabsTrigger value="details">Details</TabsTrigger>
                    </TabsList>
                    <TabsContent value="chart" className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={formatResultsForChart(results)}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="variant" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="rate" fill="hsl(var(--primary))" name="Conversion Rate %" />
                        </BarChart>
                      </ResponsiveContainer>
                    </TabsContent>
                    <TabsContent value="details">
                      <div className="space-y-3">
                        {Object.entries(results).map(([variant, data]: [string, any]) => (
                          <Card key={variant}>
                            <CardContent className="pt-6">
                              <div className="flex justify-between items-center mb-2">
                                <h4 className="font-semibold">{variant}</h4>
                                <Badge>{data.conversion_rate.toFixed(2)}%</Badge>
                              </div>
                              <div className="grid grid-cols-3 gap-4 text-sm">
                                <div>
                                  <p className="text-muted-foreground">Total</p>
                                  <p className="font-bold">{data.total}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Conversions</p>
                                  <p className="font-bold">{data.conversions}</p>
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Avg Value</p>
                                  <p className="font-bold">${data.avg_value.toFixed(2)}</p>
                                </div>
                              </div>
                              <Progress value={data.conversion_rate} className="mt-3" />
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
