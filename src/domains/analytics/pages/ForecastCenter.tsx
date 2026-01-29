import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/integrations/api/client';
import { useAuth } from '@/domains/auth/contexts/AuthContext';
import { useToast } from '@/domains/shared/hooks/use-toast';
import { TrendingUp, DollarSign, Package, AlertCircle, Database, Activity, RefreshCw } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { SeedDemoDataButton } from '@/domains/shared/components/SeedDemoDataButton';

interface GeoItem {
  name: string;
}

interface ForecastDataPoint {
  date: string;
  predicted: number;
  lower: number;
  upper: number;
}

interface ActualsDataPoint {
  date: string;
  actual: number;
}

interface SeedProgress {
  status: string;
  message: string;
  details?: Record<string, any>;
}

export default function ForecastCenter() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [systemMetrics, setSystemMetrics] = useState<Record<string, any> | null>(null);
  const [isSeedingData, setIsSeedingData] = useState(false);
  const [seedProgress, setSeedProgress] = useState<SeedProgress | null>(null);
  
  // Hierarchy filters
  const [countries, setCountries] = useState<GeoItem[]>([]);
  const [regions, setRegions] = useState<GeoItem[]>([]);
  const [states, setStates] = useState<GeoItem[]>([]);
  const [cities, setCities] = useState<GeoItem[]>([]);
  const [hubs, setHubs] = useState<GeoItem[]>([]);
  const [pinCodes, setPinCodes] = useState<GeoItem[]>([]);
  
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedState, setSelectedState] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedHub, setSelectedHub] = useState('');
  const [selectedPinCode, setSelectedPinCode] = useState('');
  
  const [forecastWindow, setForecastWindow] = useState<'short' | 'mid' | 'long'>('mid');
  const [forecastData, setForecastData] = useState<ForecastDataPoint[]>([]);
  const [actualsData, setActualsData] = useState<ActualsDataPoint[]>([]);
  const [metrics, setMetrics] = useState({
    volume: 0,
    revenue: 0,
    spend: 0,
    confidence: 0
  });

  useEffect(() => {
    loadGeography();
    loadSystemMetrics();
  }, []);

  const FALLBACK = {
    countries: ['US', 'IN'],
    regions: ['North', 'South', 'East', 'West'],
    states: ['State A', 'State B', 'State C'],
    cities: ['City 1', 'City 2', 'City 3'],
    hubs: ['Hub 1', 'Hub 2'],
    pinCodes: ['110001', '110002']
  } as const;

  useEffect(() => {
    if (selectedCountry || selectedCity || selectedHub) {
      loadForecasts();
    }
  }, [selectedCountry, selectedRegion, selectedState, selectedCity, selectedHub, selectedPinCode, forecastWindow]);

  const loadGeography = async () => {
    try {
      const result = await apiClient.from('geography_hierarchy')
        .select('*')
        .order('country');
      
      const data = result.data;
      console.log('Geography data loaded:', data?.length || 0, 'records');
      
      if (data && data.length > 0) {
        const uniqueCountries = [...new Set(data.map(g => g.country))].filter(Boolean);
        if (uniqueCountries.length === 0) {
          setCountries(FALLBACK.countries.map(c => ({ name: c })));
        } else {
          const countryItems = uniqueCountries.map(c => ({ name: c }));
          setCountries(countryItems);
          // Auto-select first country to trigger cascade
          if (!selectedCountry && countryItems.length > 0) {
            setSelectedCountry(countryItems[0].name);
            loadRegions(countryItems[0].name);
          }
        }
      } else {
        setCountries(FALLBACK.countries.map(c => ({ name: c })));
      }
    } catch (error) {
      console.error('Error loading geography:', error);
      setCountries(FALLBACK.countries.map(c => ({ name: c })));
    }
  };

  const loadRegions = async (country: string) => {
    try {
      const result = await apiClient.from('geography_hierarchy')
        .select('region')
        .eq('country', country);
      
      const data = result.data;
      
      if (data && data.length > 0) {
        const uniqueRegions = [...new Set(data.map(g => g.region))].filter(Boolean);
        if (uniqueRegions.length === 0) {
          setRegions(FALLBACK.regions.map(r => ({ name: r })));
        } else {
          setRegions(uniqueRegions.map(r => ({ name: r })));
        }
      } else {
        setRegions(FALLBACK.regions.map(r => ({ name: r })));
      }
    } catch (error) {
      console.warn('Error loading regions:', error);
      setRegions(FALLBACK.regions.map(r => ({ name: r })));
    }
  };

  const loadStates = async (country: string, region: string) => {
    try {
      const result = await apiClient.from('geography_hierarchy')
        .select('state')
        .eq('country', country)
        .eq('region', region);
      
      const data = result.data;
      
      if (data && data.length > 0) {
        const uniqueStates = [...new Set(data.map(g => g.state))].filter(Boolean);
        if (uniqueStates.length === 0) {
          setStates(FALLBACK.states.map(s => ({ name: s })));
        } else {
          setStates(uniqueStates.map(s => ({ name: s })));
        }
      } else {
        setStates(FALLBACK.states.map(s => ({ name: s })));
      }
    } catch (error) {
      console.warn('Error loading states:', error);
      setStates(FALLBACK.states.map(s => ({ name: s })));
    }
  };

  const loadCities = async (country: string, region: string, state: string) => {
    try {
      const result = await apiClient.from('geography_hierarchy')
        .select('city')
        .eq('country', country)
        .eq('region', region)
        .eq('state', state);
      
      const data = result.data;
      
      if (data && data.length > 0) {
        const uniqueCities = [...new Set(data.map(g => g.city))].filter(Boolean);
        if (uniqueCities.length === 0) {
          setCities(FALLBACK.cities.map(c => ({ name: c })));
        } else {
          setCities(uniqueCities.map(c => ({ name: c })));
        }
      } else {
        setCities(FALLBACK.cities.map(c => ({ name: c })));
      }
    } catch (error) {
      console.warn('Error loading cities:', error);
      setCities(FALLBACK.cities.map(c => ({ name: c })));
    }
  };

  const loadHubs = async (country: string, region: string, state: string, city: string) => {
    try {
      const result = await apiClient.from('geography_hierarchy')
        .select('partner_hub')
        .eq('country', country)
        .eq('region', region)
        .eq('state', state)
        .eq('city', city);
      
      const data = result.data;
      
      if (data && data.length > 0) {
        const uniqueHubs = [...new Set(data.map(g => g.partner_hub))].filter(Boolean);
        if (uniqueHubs.length === 0) {
          setHubs(FALLBACK.hubs.map(h => ({ name: h })));
        } else {
          setHubs(uniqueHubs.map(h => ({ name: h })));
        }
      } else {
        setHubs(FALLBACK.hubs.map(h => ({ name: h })));
      }
    } catch (error) {
      console.warn('Error loading hubs:', error);
      setHubs(FALLBACK.hubs.map(h => ({ name: h })));
    }
  };

  const loadPinCodes = async (country: string, region: string, state: string, city: string, hub: string) => {
    try {
      const result = await apiClient.from('geography_hierarchy')
        .select('pin_code')
        .eq('country', country)
        .eq('region', region)
        .eq('state', state)
        .eq('city', city)
        .eq('partner_hub', hub);
      
      const data = result.data;
      
      if (data && data.length > 0) {
        const uniquePinCodes = [...new Set(data.map(g => g.pin_code))].filter(Boolean);
        if (uniquePinCodes.length === 0) {
          setPinCodes(FALLBACK.pinCodes.map(p => ({ name: p })));
        } else {
          setPinCodes(uniquePinCodes.map(p => ({ name: p })));
        }
      } else {
        setPinCodes(FALLBACK.pinCodes.map(p => ({ name: p })));
      }
    } catch (error) {
      console.warn('Error loading pin codes:', error);
      setPinCodes(FALLBACK.pinCodes.map(p => ({ name: p })));
    }
  };
  const loadForecasts = async () => {
    setLoading(true);
    try {
      const days = forecastWindow === 'short' ? 30 : forecastWindow === 'mid' ? 90 : 365;

      if (!user) {
        setForecastData([]);
        setMetrics({ volume: 0, revenue: 0, spend: 0, confidence: 0 });
        return;
      }

      const tenantId = user.id; // Use user.id as tenant_id
      
      let query = apiClient.from('forecast_outputs')
        .select('*')
        .eq('tenant_id', tenantId)
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
      } else {
        // Default to country level when nothing is selected
        const baseCountry = countries.length > 0 ? countries[0].name : 'India';
        query = query.eq('geography_level', 'country').eq('country', baseCountry);
      }

      const result = await query;
      const data = result.data;

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
      if (!user) return;

      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 12);

      const tenantId = user.id;

      // Build query with conditional filters
      let q: any = apiClient.from('work_orders')
        .select('created_at')
        .gte('created_at', startDate.toISOString());
      
      if (tenantId) q = q.eq('tenant_id', tenantId);
      if (selectedPinCode) q = q.eq('pin_code', selectedPinCode);
      else if (selectedHub) q = q.eq('partner_hub', selectedHub);
      else if (selectedCity) q = q.eq('city', selectedCity);
      else if (selectedState) q = q.eq('state', selectedState);
      else if (selectedRegion) q = q.eq('region', selectedRegion);
      else if (selectedCountry) q = q.eq('country', selectedCountry);
      
      const result = await q;
      const data = result.data;

      if (data) {
        const monthlyActuals = data.reduce((acc: Record<string, number>, wo: { created_at: string }) => {
          const month = new Date(wo.created_at).toISOString().slice(0, 7);
          acc[month] = (acc[month] || 0) + 1;
          return acc;
        }, {});

        setActualsData(Object.entries(monthlyActuals).map(([month, count]) => ({
          date: month,
          actual: count as number
        })));
      }
    } catch (error) {
      console.error('Error loading actuals:', error);
    }
  };

  const seedIndiaData = async () => {
    setSeeding(true);
    setIsSeedingData(true);
    setSeedProgress({ status: 'starting', message: 'Initializing India data seed...' });
    
    try {
      if (!user) throw new Error('Not authenticated');

      // Get tenant_id from user context (or use user.id as fallback)
      const tenantId = user.id; // TODO: Get from profile if available

      setSeedProgress({ status: 'generating', message: 'Generating 12 months of synthetic data...' });

      const result = await apiClient.functions.invoke('seed-india-data', {
        body: { tenant_id: tenantId }
      });

      if (result.error) throw result.error;
      
      const data = result.data;

      setSeedProgress({ 
        status: 'completed', 
        message: data.total_records ? `✅ Seeded ${data.total_records.toLocaleString()} work orders` : `✅ ${data.message || 'Seeding started'}`,
        details: data
      });

      toast({
        title: 'India Data Seeded Successfully',
        description: data.total_records 
          ? `${data.total_records.toLocaleString()} work orders created. ${data.forecast?.triggered ? 'Forecasts triggered.' : ''}`
          : data.message || 'Background processing started'
      });

      await loadSystemMetrics();
      await loadGeography();
    } catch (error: any) {
      console.error('Seed error:', error);
      setSeedProgress({ status: 'failed', message: error.message });
      toast({
        variant: 'destructive',
        title: 'Error seeding data',
        description: error.message
      });
    } finally {
      setSeeding(false);
      setIsSeedingData(false);
    }
  };

  const generateForecasts = async () => {
    setGenerating(true);
    try {
      if (!user) throw new Error('Not authenticated');
      const tenantId = user.id;

      const result = await apiClient.functions.invoke('run-forecast-now', {
        body: {
          tenant_id: tenantId,
          geography_levels: ['country', 'region', 'state', 'city', 'partner_hub', 'pin_code']
        }
      });

      if (result.error) throw result.error;
      const data = result.data;

      toast({
        title: 'Forecast Generation Started',
        description: `${data.jobs?.length || 0} forecast jobs enqueued. Processing...`
      });

      setTimeout(() => {
        loadForecasts();
        loadSystemMetrics();
      }, 5000);
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

  const loadSystemMetrics = async () => {
    try {
      if (!user) return;

      const result = await apiClient.functions.invoke('get-forecast-metrics', {
        body: {
          tenant_id: user.id
        }
      });

      if (result.error) throw result.error;
      setSystemMetrics(result.data);
    } catch (error: any) {
      console.error('Error loading metrics:', error);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Forecast Center</h1>
          <p className="text-muted-foreground">India Forecasting Intelligence System</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={seedIndiaData} disabled={seeding} variant="default" size="lg">
            {seeding ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Seeding India Data...
              </>
            ) : (
              <>
                <Database className="mr-2 h-4 w-4" />
                Run India Full Seed + Forecast
              </>
            )}
          </Button>
          <Button onClick={generateForecasts} disabled={generating} variant="outline" size="lg">
            {generating ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Regenerate Forecasts Only
              </>
            )}
          </Button>
        </div>
      </div>

      <SeedDemoDataButton />

      {/* Seed Progress Alert */}
      {seedProgress && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                {seedProgress.status === 'starting' && <RefreshCw className="h-5 w-5 animate-spin text-primary" />}
                {seedProgress.status === 'generating' && <RefreshCw className="h-5 w-5 animate-spin text-primary" />}
                {seedProgress.status === 'completed' && <Activity className="h-5 w-5 text-green-600" />}
                {seedProgress.status === 'failed' && <AlertCircle className="h-5 w-5 text-destructive" />}
                <p className="font-medium">{seedProgress.message}</p>
              </div>
              {seedProgress.details && (
                <div className="pl-7 space-y-1 text-sm text-muted-foreground">
                  <div className="grid grid-cols-2 gap-2">
                    <div>Job ID: {seedProgress.details.job_id?.substring(0, 8)}...</div>
                    <div>Months: {seedProgress.details.months_covered}</div>
                    <div>Start: {seedProgress.details.start_date}</div>
                    <div>End: {seedProgress.details.end_date}</div>
                  </div>
                   {seedProgress.details?.validation && (
                    <div className="mt-2 p-2 bg-muted/50 rounded">
                      <div className="font-medium text-sm">Validation: {seedProgress.details.validation.status}</div>
                      {seedProgress.details.validation.product_distribution?.map((pd: any) => (
                        <div key={pd.category} className="text-xs">
                          {pd.category}: {pd.count?.toLocaleString() || 0} ({pd.percentage || '0'}%)
                        </div>
                      ))}
                    </div>
                  )}
                  {seedProgress.details.forecast?.triggered && (
                    <div className="text-green-600 font-medium">
                      ✅ Forecast generation triggered ({seedProgress.details.forecast.job_ids?.length || 0} jobs)
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* System Status */}
      {systemMetrics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              System Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Data Seeded</p>
                <Badge variant={systemMetrics.system_status.data_seeded ? 'default' : 'secondary'}>
                  {systemMetrics.system_status.data_seeded ? 'Yes' : 'No'}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Models Trained</p>
                <Badge variant={systemMetrics.system_status.models_trained ? 'default' : 'secondary'}>
                  {systemMetrics.models.total} models
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Forecasts Generated</p>
                <Badge variant={systemMetrics.system_status.forecasts_generated ? 'default' : 'secondary'}>
                  {systemMetrics.forecasts.total} points
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Model Accuracy</p>
                <Badge variant="outline">
                  {systemMetrics.models.average_accuracy}%
                </Badge>
              </div>
            </div>
            {systemMetrics.seed_info && (
              <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                <p className="text-sm font-medium mb-2">Seeded Data Coverage</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Records:</span> {systemMetrics.seed_info.total_records?.toLocaleString() || '0'}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Period:</span> {systemMetrics.seed_info.months_covered || 0} months
                  </div>
                  <div>
                    <span className="text-muted-foreground">States:</span> {systemMetrics.seed_info.geography_coverage?.states || 0}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Hubs:</span> {systemMetrics.seed_info.geography_coverage?.hubs || 0}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

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