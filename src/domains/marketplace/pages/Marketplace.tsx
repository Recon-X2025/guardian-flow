import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/integrations/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/domains/shared/hooks/use-toast';
import { Package, Star, Download, Settings } from 'lucide-react';

interface MarketplaceExtension {
  id: string;
  extension_name: string;
  description?: string;
  category?: string;
  rating?: number;
  icon_url?: string;
  status: string;
}

interface InstalledExtension {
  extension_id: string;
}

interface ListInstalledResponse {
  extensions: InstalledExtension[];
}

export default function Marketplace() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedExtension, setSelectedExtension] = useState<string | null>(null);

  const { data: extensions, isLoading } = useQuery({
    queryKey: ['marketplace-extensions'],
    queryFn: async () => {
      const { data, error } = await apiClient
        .from('marketplace_extensions')
        .select('*')
        .eq('status', 'approved')
        .order('rating', { ascending: false });

      if (error) throw error;
      return data as MarketplaceExtension[];
    },
  });

  const { data: installed } = useQuery({
    queryKey: ['installed-extensions'],
    queryFn: async () => {
      const { data, error } = await apiClient.functions.invoke('marketplace-extension-manager', {
        body: { action: 'list_installed' }
      });

      if (error) throw error;
      return (data as ListInstalledResponse)?.extensions || [];
    },
  });

  const installMutation = useMutation({
    mutationFn: async (extensionId: string) => {
      const { data, error } = await apiClient.functions.invoke('marketplace-extension-manager', {
        body: { action: 'install', extensionId }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['installed-extensions'] });
      toast({
        title: 'Extension installed',
        description: 'The extension has been successfully installed.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Installation failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const uninstallMutation = useMutation({
    mutationFn: async (extensionId: string) => {
      const { data, error } = await apiClient.functions.invoke('marketplace-extension-manager', {
        body: { action: 'uninstall', extensionId }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['installed-extensions'] });
      toast({
        title: 'Extension uninstalled',
        description: 'The extension has been removed.',
      });
    },
  });

  const isInstalled = (extensionId: string) => {
    return installed?.some((ext: InstalledExtension) => ext.extension_id === extensionId);
  };

  if (isLoading) {
    return <div className="p-8">Loading marketplace...</div>;
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Extension Marketplace</h1>
          <p className="text-muted-foreground">
            Extend Guardian Flow with powerful integrations
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {extensions?.map((extension: MarketplaceExtension) => (
          <Card key={extension.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {extension.icon_url ? (
                    <img src={extension.icon_url} alt="" className="w-10 h-10 rounded" />
                  ) : (
                    <Package className="w-10 h-10 text-primary" />
                  )}
                  <div>
                    <CardTitle className="text-lg">{extension.extension_name}</CardTitle>
                    <Badge variant="outline">{extension.category}</Badge>
                  </div>
                </div>
              </div>
              <CardDescription>{extension.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span>{extension.rating?.toFixed(1) || '0.0'}</span>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Download className="w-4 h-4" />
                  <span>{extension.install_count} installs</span>
                </div>
              </div>

              <div className="flex gap-2">
                {isInstalled(extension.id) ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => uninstallMutation.mutate(extension.id)}
                      disabled={uninstallMutation.isPending}
                    >
                      Uninstall
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedExtension(extension.id)}
                    >
                      <Settings className="w-4 h-4" />
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => installMutation.mutate(extension.id)}
                    disabled={installMutation.isPending}
                  >
                    Install
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}