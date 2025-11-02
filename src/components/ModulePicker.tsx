import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';

interface Module {
  module_id: string;
  name: string;
  description: string;
  industries: string[];
  category: string;
}

export default function ModulePicker() {
  const navigate = useNavigate();
  const location = useLocation();
  const { planId, billingCycle, maxModules } = location.state || {};
  
  const [modules, setModules] = useState<Module[]>([]);
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchModules();
  }, []);

  const fetchModules = async () => {
    const { data, error } = await supabase
      .from('available_modules')
      .select('*')
      .eq('active', true)
      .order('sort_order');
    
    if (!error && data) {
      setModules(data);
    }
  };

  const toggleModule = (moduleId: string) => {
    if (maxModules && selectedModules.length >= maxModules && !selectedModules.includes(moduleId)) {
      return; // Can't select more
    }
    
    setSelectedModules(prev =>
      prev.includes(moduleId)
        ? prev.filter(id => id !== moduleId)
        : [...prev, moduleId]
    );
  };

  const handleContinue = () => {
    navigate('/auth/onboarding', {
      state: {
        planId,
        billingCycle,
        selectedModules
      }
    });
  };

  return (
    <div className="min-h-screen p-4 bg-gradient-to-br from-primary/10 via-background to-accent/10">
      <div className="max-w-6xl mx-auto py-12 space-y-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-2">Choose Your Modules</h2>
          {maxModules ? (
            <>
              <p className="text-muted-foreground">
                Select {maxModules} module{maxModules > 1 ? 's' : ''} to get started
              </p>
              <div className="mt-4">
                <Badge variant="secondary" className="text-base px-4 py-2">
                  {selectedModules.length} / {maxModules} selected
                </Badge>
              </div>
            </>
          ) : (
            <p className="text-muted-foreground">
              Select modules to get started
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map(module => (
            <Card
              key={module.module_id}
              className={`cursor-pointer transition-all ${
                selectedModules.includes(module.module_id)
                  ? 'border-primary ring-2 ring-primary'
                  : maxModules && selectedModules.length >= maxModules
                  ? 'opacity-50 cursor-not-allowed'
                  : ''
              }`}
              onClick={() => maxModules ? (selectedModules.length < maxModules || selectedModules.includes(module.module_id)) && toggleModule(module.module_id) : toggleModule(module.module_id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{module.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {module.description}
                    </CardDescription>
                  </div>
                  <Checkbox
                    checked={selectedModules.includes(module.module_id)}
                    onCheckedChange={() => toggleModule(module.module_id)}
                    disabled={maxModules ? !selectedModules.includes(module.module_id) && selectedModules.length >= maxModules : false}
                    className="mt-1"
                  />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-1">
                  {module.industries.slice(0, 3).map((industry, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {industry}
                    </Badge>
                  ))}
                  {module.industries.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{module.industries.length - 3} more
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center pt-6">
          <Button
            size="lg"
            onClick={handleContinue}
            disabled={maxModules ? selectedModules.length !== maxModules : selectedModules.length === 0}
          >
            Continue to Company Setup
          </Button>
        </div>
      </div>
    </div>
  );
}

