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
  const [regions, setRegions] = useState<any[]>([]);
  const [states, setStates] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [hubs, setHubs] = useState<any[]>([]);
  const [pinCodes, setPinCodes] = useState<any[]>([]);
  
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedHub, setSelectedHub] = useState('');
  const [selectedPinCode, setSelectedPinCode] = useState('');
  
  const [forecastWindow, setForecastWindow] = useState<'short' | 'mid' | 'long'>('short');
  const [forecastData, setForecastData] = useState<any[]>([]);
  const [actualsData, setActualsData] = useState<any[]>([]);
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
  }, [selectedCountry, selectedRegion, selectedState, selectedCity, selectedHub, selectedPinCode, forecastWindow]);

  const loadGeography = async () => {
    const { data } = await supabase
      .from('geography_hierarchy')
      .select('*')
      .order('country');
    
    if (data) {
      const uniqueCountries = [...new Set(data.map(g => g.country))].filter(Boolean);
      setCountries(uniqueCountries.map(c => ({ name: c })));
    }
  };

  const loadRegions = async (country: string) => {
    const { data } = await supabase
      .from('geography_hierarchy')
      .select('region')
      .eq('country', country);
    
    if (data) {
      const uniqueRegions = [...new Set(data.map(g => g.region))].filter(Boolean);
      setRegions(uniqueRegions.map(r => ({ name: r })));
    }
  };

  const loadStates = async (country: string, region: string) => {
    const { data } = await supabase
      .from('geography_hierarchy')
      .select('state')
      .eq('country', country)
      .eq('region', region);
    
    if (data) {
      const uniqueStates = [...new Set(data.map(g => g.state))].filter(Boolean);
      setStates(uniqueStates.map(s => ({ name: s })));
    }
  };

  const loadCities = async (country: string, region: string, state: string) => {
    const { data } = await supabase
      .from('geography_hierarchy')
      .select('city')
      .eq('country', country)
      .eq('region', region)
      .eq('state', state);
    
    if (data) {
      const uniqueCities = [...new Set(data.map(g => g.city))].filter(Boolean);
      setCities(uniqueCities.map(c => ({ name: c })));
    }
  };

  const loadHubs = async (country: string, region: string, state: string, city: string) => {
    const { data } = await supabase
      .from('geography_hierarchy')
      .select('partner_hub')
      .eq('country', country)
      .eq('region', region)
      .eq('state', state)
      .eq('city', city);
    
    if (data) {
      const uniqueHubs = [...new Set(data.map(g => g.partner_hub))].filter(Boolean);
      setHubs(uniqueHubs.map(h => ({ name: h })));
    }
  };

  const loadPinCodes = async (country: string, region: string, state: string, city: string, hub: string) => {
    const { data } = await supabase
      .from('geography_hierarchy')
      .select('pin_code')
      .eq('country', country)
      .eq('region', region)
      .eq('state', state)
      .eq('city', city)
      .eq('partner_hub', hub);
    
    if (data) {
      const uniquePinCodes = [...new Set(data.map(g => g.pin_code))].filter(Boolean);
      setPinCodes(uniquePinCodes.map(p => ({ name: p })));
    }
  };

  const loadForecasts = async () => {
    setLoading(true);
    try {
      const days = forecastWindow === 'short' ? 30 : forecastWindow === 'mid' ? 90 : 365;
      
      let query = supabase
        .from('forecast_outputs')
        .select('*')
        .eq('forecast_type', 'volume')
        .gte('target_date', new Date().toISOString().split('T')[0])
        .lte('target_date', new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
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

      // Load actuals for comparison (past 12 months)
      await loadActuals();
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

  const loadActuals = async () => {
    try {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 12);

      let query = supabase
        .from('work_orders')
        .select('created_at')
        .gte('created_at', startDate.toISOString());

      if (selectedPinCode) {
        query = query.eq('pin_code', selectedPinCode);
      } else if (selectedHub) {
        query = query.eq('partner_hub', selectedHub);
      } else if (selectedCity) {
        query = query.eq('city', selectedCity);
      } else if (selectedState) {
        query = query.eq('state', selectedState);
      } else if (selectedRegion) {
        query = query.eq('region', selectedRegion);
      } else if (selectedCountry) {
        query = query.eq('country', selectedCountry);
      }

      const { data } = await query;

      if (data) {
        const monthlyActuals = data.reduce((acc: any, wo: any) => {
          const month = new Date(wo.created_at).toISOString().slice(0, 7);
          acc[month] = (acc[month] || 0) + 1;
          return acc;
        }, {});

        setActualsData(Object.entries(monthlyActuals).map(([month, count]) => ({
          date: month,
          actual: count
        })));
      }
    } catch (error) {
      console.error('Error loading actuals:', error);
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
            <Select value={selectedCountry} onValueChange={(val) => {
              setSelectedCountry(val);
              setSelectedRegion('');
              setSelectedState('');
              setSelectedCity('');
              setSelectedHub('');
              setSelectedPinCode('');
              loadRegions(val);
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Country" />
              </SelectTrigger>
              <SelectContent>
                {countries.map(c => (
                  <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedRegion} onValueChange={(val) => {
              setSelectedRegion(val);
              setSelectedState('');
              setSelectedCity('');
              setSelectedHub('');
              setSelectedPinCode('');
              if (selectedCountry) loadStates(selectedCountry, val);
            }} disabled={!selectedCountry}>
              <SelectTrigger>
                <SelectValue placeholder="Region" />
              </SelectTrigger>
              <SelectContent>
                {regions.map(r => (
                  <SelectItem key={r.name} value={r.name}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedState} onValueChange={(val) => {
              setSelectedState(val);
              setSelectedCity('');
              setSelectedHub('');
              setSelectedPinCode('');
              if (selectedCountry && selectedRegion) loadCities(selectedCountry, selectedRegion, val);
            }} disabled={!selectedRegion}>
              <SelectTrigger>
                <SelectValue placeholder="State" />
              </SelectTrigger>
              <SelectContent>
                {states.map(s => (
                  <SelectItem key={s.name} value={s.name}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedCity} onValueChange={(val) => {
              setSelectedCity(val);
              setSelectedHub('');
              setSelectedPinCode('');
              if (selectedCountry && selectedRegion && selectedState) {
                loadHubs(selectedCountry, selectedRegion, selectedState, val);
              }
            }} disabled={!selectedState}>
              <SelectTrigger>
                <SelectValue placeholder="City" />
              </SelectTrigger>
              <SelectContent>
                {cities.map(c => (
                  <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedHub} onValueChange={(val) => {
              setSelectedHub(val);
              setSelectedPinCode('');
              if (selectedCountry && selectedRegion && selectedState && selectedCity) {
                loadPinCodes(selectedCountry, selectedRegion, selectedState, selectedCity, val);
              }
            }} disabled={!selectedCity}>
              <SelectTrigger>
                <SelectValue placeholder="Hub" />
              </SelectTrigger>
              <SelectContent>
                {hubs.map(h => (
                  <SelectItem key={h.name} value={h.name}>{h.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedPinCode} onValueChange={setSelectedPinCode} disabled={!selectedHub}>
              <SelectTrigger>
                <SelectValue placeholder="Pin Code" />
              </SelectTrigger>
              <SelectContent>
                {pinCodes.map(p => (
                  <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>
                ))}
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

      {/* Forecast Window Selector */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <Button 
              variant={forecastWindow === 'short' ? 'default' : 'outline'}
              onClick={() => setForecastWindow('short')}
            >
              1 Month
            </Button>
            <Button 
              variant={forecastWindow === 'mid' ? 'default' : 'outline'}
              onClick={() => setForecastWindow('mid')}
            >
              3 Months
            </Button>
            <Button 
              variant={forecastWindow === 'long' ? 'default' : 'outline'}
              onClick={() => setForecastWindow('long')}
            >
              1 Year
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Forecast Chart */}
      <Card>
        <CardHeader>
          <CardTitle>
            {forecastWindow === 'short' ? '1 Month' : forecastWindow === 'mid' ? '3 Month' : '1 Year'} Forecast
          </CardTitle>
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

      {/* Forecast vs Actuals */}
      <Card>
        <CardHeader>
          <CardTitle>Forecast vs Actuals (12 Month Trend)</CardTitle>
        </CardHeader>
        <CardContent>
          {actualsData.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={actualsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="actual" stroke="#10b981" name="Actual Volume" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              No historical data available for comparison
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}