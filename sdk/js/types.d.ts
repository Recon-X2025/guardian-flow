export interface SDKConfig {
  baseUrl: string;
  apiKey?: string;
  tenantId?: string;
}

export interface WorkOrder {
  id: string;
  title: string;
  status: string;
  priority: string;
  tenant_id: string;
  created_at: string;
  [key: string]: unknown;
}

export interface Technician {
  id: string;
  name: string;
  skills: string[];
  [key: string]: unknown;
}

export interface Asset {
  id: string;
  name: string;
  serial_number: string;
  tenant_id: string;
  [key: string]: unknown;
}

export interface RULResult {
  asset_id: string;
  rul_days: number;
  confidence: number;
  [key: string]: unknown;
}

export interface IoTDevice {
  id: string;
  device_id: string;
  tenant_id: string;
  [key: string]: unknown;
}

export interface NLPQueryResult {
  answer: string;
  query?: string;
  results?: unknown[];
}

export interface Invoice {
  id: string;
  amount: number;
  status: string;
  [key: string]: unknown;
}

export interface AuthResult {
  token: string;
  user: { id: string; email: string; [key: string]: unknown };
}

export declare class GuardianFlowSDK {
  constructor(config: SDKConfig);

  authenticate(email: string, password: string): Promise<AuthResult>;

  listWorkOrders(filters?: Record<string, string>): Promise<{ workOrders: WorkOrder[] }>;
  getWorkOrder(id: string): Promise<WorkOrder>;
  createWorkOrder(data: Partial<WorkOrder>): Promise<WorkOrder>;
  updateWorkOrderStatus(id: string, status: string): Promise<WorkOrder>;

  listTechnicians(filters?: Record<string, string>): Promise<{ technicians: Technician[] }>;

  listAssets(filters?: Record<string, string>): Promise<{ assets: Asset[] }>;
  getAsset(id: string): Promise<Asset>;
  getAssetRUL(id: string): Promise<RULResult>;

  registerDevice(data: Partial<IoTDevice>): Promise<IoTDevice>;
  getDevices(): Promise<{ devices: IoTDevice[] }>;
  ingestReading(deviceId: string, metric: string, value: number): Promise<{ success: boolean }>;

  nlpQuery(question: string): Promise<NLPQueryResult>;

  listInvoices(filters?: Record<string, string>): Promise<{ invoices: Invoice[] }>;
  createInvoice(data: Partial<Invoice>): Promise<Invoice>;
}
