// Deterministic feature rollout hashing

export function hashTenantId(tenantId: string): number {
  const encoder = new TextEncoder();
  const data = encoder.encode(tenantId);
  
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    hash = ((hash << 5) - hash) + data[i];
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return Math.abs(hash) % 100;
}

export function isFeatureEnabledForTenant(
  tenantId: string, 
  rolloutPercentage: number
): boolean {
  const hash = hashTenantId(tenantId);
  return hash < rolloutPercentage;
}
