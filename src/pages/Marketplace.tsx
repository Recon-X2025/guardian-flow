import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Star, Download, Search, TrendingUp, Shield, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export default function Marketplace() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const { data: extensions, isLoading } = useQuery({
    queryKey: ['marketplace-extensions', selectedCategory, searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('marketplace_extensions')
        .select('*')
        .eq('status', 'approved')
        .order('install_count', { ascending: false });

      if (selectedCategory !== 'all') {
        query = query.eq('category', selectedCategory);
      }

      if (searchQuery) {
        query = query.ilike('name', `%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const { data: myInstallations } = useQuery({
    queryKey: ['my-installations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('extension_installations')
        .select('extension_id')
        .eq('user_id', user?.id);
      if (error) throw error;
      return data?.map(i => i.extension_id) || [];
    },
    enabled: !!user,
  });

  const installMutation = useMutation({
    mutationFn: async (extensionId: string) => {
      const { error } = await supabase
        .from('extension_installations')
        .insert({
          extension_id: extensionId,
          user_id: user?.id,
          status: 'active',
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-installations'] });
      toast.success('Extension installed successfully');
    },
    onError: () => {
      toast.error('Failed to install extension');
    },
  });

  const categories = [
    { value: 'all', label: 'All Extensions', icon: TrendingUp },
    { value: 'analytics', label: 'Analytics', icon: TrendingUp },
    { value: 'automation', label: 'Automation', icon: Zap },
    { value: 'integration', label: 'Integrations', icon: Shield },
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Extension Marketplace</h1>
          <p className="text-muted-foreground">Enhance your Guardian Flow platform</p>
        </div>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search extensions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
        <TabsList>
          {categories.map((cat) => (
            <TabsTrigger key={cat.value} value={cat.value}>
              <cat.icon className="h-4 w-4 mr-2" />
              {cat.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={selectedCategory} className="mt-6">
          {isLoading ? (
            <div className="text-center py-12">Loading extensions...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {extensions?.map((ext) => (
                <Card key={ext.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle>{ext.name}</CardTitle>
                        <CardDescription className="mt-2">{ext.description}</CardDescription>
                      </div>
                      <Badge variant="secondary">{ext.category}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span>{ext.rating?.toFixed(1) || '0.0'}</span>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Download className="h-4 w-4" />
                        <span>{ext.install_count || 0}</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <span className="text-sm font-bold">
                        ${ext.pricing_model === 'free' ? 'Free' : ext.price}
                        {ext.pricing_model === 'subscription' && '/mo'}
                      </span>
                    </div>

                    <Button
                      className="w-full"
                      disabled={myInstallations?.includes(ext.id)}
                      onClick={() => installMutation.mutate(ext.id)}
                    >
                      {myInstallations?.includes(ext.id) ? 'Installed' : 'Install'}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
