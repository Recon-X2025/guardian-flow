import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { TrendingUp, DollarSign, Package, AlertCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function ForecastCenter() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  
  // Hierarchy filters
  const [countries, setCountries] = useState<any[]>([]);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedHub, setSelectedHub] = useState('');
  const [selectedPinCode, setSelectedPinCode] = useState('');
  
  const [forecastData, setForecastData] = useState<any[]>([]);
  const [metrics, setMetrics] = useState({
    volume: 0,
    revenue: 0,
    spend: 0,
    confidence: 0
  });

  useEffect(() => {
    loadGeography();
  }, []);

  useEffect(() => {
    if (selectedCountry || selectedCity || selectedHub) {
      loadForecasts();
    }
  }, [selectedCountry, selectedRegion, selectedState, selectedCity, selectedHub, selectedPinCode]);

  const loadGeography = async () => {
    const { data } = await supabase
      .from('geography_hierarchy')
      .select('*')
      .order('country');
    
    if (data) {
      const uniqueCountries = [...new Set(data.map(g => g.country))];
      setCountries(uniqueCountries.map(c => ({ name: c })));
    }
  };

  const loadForecasts = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('forecast_outputs')
        .select('*')
        .eq('forecast_type', 'volume')
        .gte('target_date', new Date().toISOString().split('T')[0])
        .lte('target_date', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('target_date');

      if (selectedPinCode) {
        query = query.eq('geography_level', 'pin_code').eq('pin_code', selectedPinCode);
      } else if (selectedHub) {
        query = query.eq('geography_level', 'partner_hub').eq('partner_hub', selectedHub);
      } else if (selectedCity) {
        query = query.eq('geography_level', 'city').eq('city', selectedCity);
      } else if (selectedState) {
        query = query.eq('geography_level', 'state').eq('state', selectedState);
      } else if (selectedRegion) {
        query = query.eq('geography_level', 'region').eq('region', selectedRegion);
      } else if (selectedCountry) {
        query = query.eq('geography_level', 'country').eq('country', selectedCountry);
      }

      const { data, error } = await query;

      if (error) throw error;

      if (data && data.length > 0) {
        setForecastData(data.map(d => ({
          date: d.target_date,
          predicted: Number(d.value),
          lower: Number(d.lower_bound),
          upper: Number(d.upper_bound)
        })));

        const avgVolume = data.reduce((sum, d) => sum + Number(d.value), 0) / data.length;
        const avgConfidence = data.reduce((sum, d) => {
          const conf = d.confidence_upper && d.confidence_lower 
            ? 1 - (Math.abs(Number(d.confidence_upper) - Number(d.confidence_lower)) / (2 * Number(d.value)))
            : 0.85;
          return sum + conf;
        }, 0) / data.length;

        setMetrics({
          volume: Math.round(avgVolume),
          revenue: Math.round(avgVolume * 150),
          spend: Math.round(avgVolume * 85),
          confidence: Math.round(avgConfidence * 100)
        });
      } else {
        setForecastData([]);
        setMetrics({ volume: 0, revenue: 0, spend: 0, confidence: 0 });
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error loading forecasts',
        description: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const generateForecasts = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-forecast', {
        body: {
          tenant_id: (await supabase.auth.getUser()).data.user?.id,
          geography_levels: ['country', 'region', 'state', 'city', 'partner_hub', 'pin_code']
        }
      });

      if (error) throw error;

      toast({
        title: 'Forecast Generation Started',
        description: `${data.jobs?.length || 0} forecast jobs enqueued. Results will appear shortly.`
      });

      setTimeout(loadForecasts, 5000);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error generating forecasts',
        description: error.message
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Forecast Center</h1>
          <p className="text-muted-foreground">Hierarchical demand & capacity forecasting</p>
        </div>
        <Button onClick={generateForecasts} disabled={generating}>
          {generating ? 'Generating...' : 'Generate Forecasts'}
        </Button>
      </div>

      {/* Hierarchy Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Geography Hierarchy</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Select value={selectedCountry} onValueChange={setSelectedCountry}>
              <SelectTrigger>
                <SelectValue placeholder="Country" />
              </SelectTrigger>
              <SelectContent>
                {countries.map(c => (
                  <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedRegion} onValueChange={setSelectedRegion} disabled={!selectedCountry}>
              <SelectTrigger>
                <SelectValue placeholder="Region" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="north">North</SelectItem>
                <SelectItem value="south">South</SelectItem>
                <SelectItem value="east">East</SelectItem>
                <SelectItem value="west">West</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedState} onValueChange={setSelectedState} disabled={!selectedRegion}>
              <SelectTrigger>
                <SelectValue placeholder="State" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="state1">State 1</SelectItem>
                <SelectItem value="state2">State 2</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedCity} onValueChange={setSelectedCity} disabled={!selectedState}>
              <SelectTrigger>
                <SelectValue placeholder="City" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="city1">City 1</SelectItem>
                <SelectItem value="city2">City 2</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedHub} onValueChange={setSelectedHub} disabled={!selectedCity}>
              <SelectTrigger>
                <SelectValue placeholder="Hub" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hub1">Hub 1</SelectItem>
                <SelectItem value="hub2">Hub 2</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedPinCode} onValueChange={setSelectedPinCode} disabled={!selectedHub}>
              <SelectTrigger>
                <SelectValue placeholder="Pin Code" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="110001">110001</SelectItem>
                <SelectItem value="110002">110002</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Forecasted Volume</p>
                <p className="text-2xl font-bold">{metrics.volume}</p>
              </div>
              <Package className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Expected Revenue</p>
                <p className="text-2xl font-bold">${metrics.revenue.toLocaleString()}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Projected Spend</p>
                <p className="text-2xl font-bold">${metrics.spend.toLocaleString()}</p>
              </div>
              <DollarSign className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Confidence</p>
                <p className="text-2xl font-bold">{metrics.confidence}%</p>
              </div>
              <AlertCircle className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Forecast Chart */}
      <Card>
        <CardHeader>
          <CardTitle>30-Day Forecast</CardTitle>
        </CardHeader>
        <CardContent>
          {forecastData.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={forecastData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="predicted" stroke="#8884d8" name="Predicted" />
                <Line type="monotone" dataKey="lower" stroke="#82ca9d" strokeDasharray="5 5" name="Lower Bound" />
                <Line type="monotone" dataKey="upper" stroke="#ffc658" strokeDasharray="5 5" name="Upper Bound" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              {loading ? 'Loading forecasts...' : 'No forecast data available. Select a geography or generate forecasts.'}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}