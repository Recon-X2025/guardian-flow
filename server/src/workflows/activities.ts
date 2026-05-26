export async function sendSlaAlertEmail(woId: string, tenantId: string): Promise<void> {
  console.log(`[Temporal Activity] SLA Breach Alert: Work Order ${woId} for Tenant ${tenantId} has exceeded the SLA threshold!`);
}

export async function processTelemetry(
  tenantId: string,
  reading: { device_id: string; metric: string; value: number; unit?: string; timestamp?: string }
): Promise<void> {
  console.log(`[Temporal Activity] Process Telemetry: Tenant ${tenantId}, Device ${reading.device_id}, Metric ${reading.metric}, Value ${reading.value}`);
}

