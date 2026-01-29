// Comprehensive role-based action permissions
export type ActionPermission = {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  execute: boolean; // For special actions like "generate", "release", etc.
};

export const roleActionPermissions: Record<string, Record<string, ActionPermission>> = {
  sys_admin: {
    workOrders: { view: true, create: true, edit: true, delete: true, execute: true },
    serviceOrders: { view: true, create: true, edit: true, delete: true, execute: true },
    dispatch: { view: true, create: true, edit: true, delete: true, execute: true },
    technicians: { view: true, create: true, edit: true, delete: true, execute: true },
    customers: { view: true, create: true, edit: true, delete: true, execute: true },
    equipment: { view: true, create: true, edit: true, delete: true, execute: true },
    tickets: { view: true, create: true, edit: true, delete: true, execute: true },
    invoices: { view: true, create: true, edit: true, delete: true, execute: true },
    inventory: { view: true, create: true, edit: true, delete: true, execute: true },
    finance: { view: true, create: true, edit: true, delete: true, execute: true },
    contracts: { view: true, create: true, edit: true, delete: true, execute: true },
    quotes: { view: true, create: true, edit: true, delete: true, execute: true },
    analytics: { view: true, create: true, edit: true, delete: true, execute: true },
    fraud: { view: true, create: true, edit: true, delete: true, execute: true },
    compliance: { view: true, create: true, edit: true, delete: true, execute: true },
    settings: { view: true, create: true, edit: true, delete: true, execute: true },
  },
  
  operations_manager: {
    workOrders: { view: true, create: false, edit: false, delete: false, execute: false },
    serviceOrders: { view: true, create: false, edit: false, delete: false, execute: false },
    dispatch: { view: true, create: false, edit: false, delete: false, execute: false },
    technicians: { view: true, create: false, edit: false, delete: false, execute: false },
    customers: { view: true, create: false, edit: false, delete: false, execute: false },
    equipment: { view: true, create: false, edit: false, delete: false, execute: false },
    tickets: { view: true, create: false, edit: false, delete: false, execute: false },
    invoices: { view: true, create: false, edit: false, delete: false, execute: false },
    inventory: { view: true, create: false, edit: false, delete: false, execute: false },
    finance: { view: true, create: false, edit: false, delete: false, execute: false },
    analytics: { view: true, create: false, edit: false, delete: false, execute: false },
  },
  
  tenant_admin: {
    workOrders: { view: true, create: true, edit: true, delete: true, execute: true },
    serviceOrders: { view: true, create: true, edit: true, delete: false, execute: true },
    dispatch: { view: true, create: true, edit: true, delete: false, execute: true },
    technicians: { view: true, create: true, edit: true, delete: false, execute: false },
    customers: { view: true, create: true, edit: true, delete: false, execute: false },
    equipment: { view: true, create: true, edit: true, delete: false, execute: false },
    tickets: { view: true, create: true, edit: true, delete: false, execute: true },
    invoices: { view: true, create: true, edit: true, delete: false, execute: true },
    inventory: { view: true, create: true, edit: true, delete: false, execute: true },
    contracts: { view: true, create: true, edit: true, delete: false, execute: true },
    quotes: { view: true, create: true, edit: true, delete: false, execute: true },
    finance: { view: true, create: false, edit: false, delete: false, execute: false },
    analytics: { view: true, create: false, edit: false, delete: false, execute: false },
    settings: { view: true, create: true, edit: true, delete: false, execute: true },
  },
  
  partner_admin: {
    workOrders: { view: true, create: true, edit: true, delete: false, execute: true },
    serviceOrders: { view: true, create: true, edit: false, delete: false, execute: true },
    dispatch: { view: true, create: true, edit: true, delete: false, execute: true },
    technicians: { view: true, create: true, edit: true, delete: false, execute: false },
    customers: { view: true, create: false, edit: false, delete: false, execute: false },
    equipment: { view: true, create: false, edit: false, delete: false, execute: false },
    tickets: { view: true, create: true, edit: true, delete: false, execute: false },
    inventory: { view: true, create: false, edit: false, delete: false, execute: false },
    invoices: { view: true, create: false, edit: false, delete: false, execute: false },
  },
  
  dispatcher: {
    workOrders: { view: true, create: true, edit: true, delete: false, execute: true },
    serviceOrders: { view: true, create: false, edit: false, delete: false, execute: false },
    dispatch: { view: true, create: true, edit: true, delete: false, execute: true },
    technicians: { view: true, create: false, edit: false, delete: false, execute: false },
    customers: { view: true, create: false, edit: false, delete: false, execute: false },
    equipment: { view: true, create: false, edit: false, delete: false, execute: false },
    tickets: { view: true, create: true, edit: true, delete: false, execute: true },
    inventory: { view: true, create: false, edit: false, delete: false, execute: false },
  },
  
  technician: {
    workOrders: { view: true, create: false, edit: true, delete: false, execute: true },
    serviceOrders: { view: true, create: false, edit: false, delete: false, execute: false },
    dispatch: { view: true, create: false, edit: false, delete: false, execute: false },
    tickets: { view: true, create: false, edit: false, delete: false, execute: false },
    equipment: { view: true, create: false, edit: false, delete: false, execute: false },
    inventory: { view: true, create: false, edit: false, delete: false, execute: false },
  },
  
  finance_manager: {
    workOrders: { view: true, create: false, edit: false, delete: false, execute: false },
    serviceOrders: { view: true, create: false, edit: false, delete: false, execute: false },
    invoices: { view: true, create: true, edit: true, delete: false, execute: true },
    finance: { view: true, create: true, edit: true, delete: false, execute: true },
    contracts: { view: true, create: true, edit: true, delete: false, execute: true },
    quotes: { view: true, create: true, edit: true, delete: false, execute: true },
    customers: { view: true, create: false, edit: false, delete: false, execute: false },
    analytics: { view: true, create: false, edit: false, delete: false, execute: true },
  },
  
  fraud_investigator: {
    workOrders: { view: true, create: false, edit: false, delete: false, execute: false },
    serviceOrders: { view: true, create: false, edit: false, delete: false, execute: false },
    fraud: { view: true, create: true, edit: true, delete: false, execute: true },
    compliance: { view: true, create: true, edit: true, delete: false, execute: true },
    invoices: { view: true, create: false, edit: false, delete: false, execute: false },
    customers: { view: true, create: false, edit: false, delete: false, execute: false },
    analytics: { view: true, create: false, edit: false, delete: false, execute: true },
  },
  
  customer: {
    workOrders: { view: true, create: false, edit: false, delete: false, execute: false },
    serviceOrders: { view: true, create: false, edit: false, delete: false, execute: false },
    tickets: { view: true, create: true, edit: false, delete: false, execute: false },
    invoices: { view: true, create: false, edit: false, delete: false, execute: false },
    equipment: { view: true, create: false, edit: false, delete: false, execute: false },
  },
  
  compliance_officer: {
    workOrders: { view: true, create: false, edit: false, delete: false, execute: false },
    compliance: { view: true, create: true, edit: true, delete: false, execute: true },
    fraud: { view: true, create: false, edit: false, delete: false, execute: false },
    invoices: { view: true, create: false, edit: false, delete: false, execute: false },
    analytics: { view: true, create: false, edit: false, delete: false, execute: true },
  },
};

export function canPerformAction(
  roles: string[],
  resource: string,
  action: keyof ActionPermission
): boolean {
  // sys_admin can do everything
  if (roles.includes('sys_admin')) return true;
  
  // Check each role for permission
  for (const role of roles) {
    const permissions = roleActionPermissions[role]?.[resource];
    if (permissions?.[action]) {
      return true;
    }
  }
  
  return false;
}

export function getResourcePermissions(
  roles: string[],
  resource: string
): ActionPermission {
  if (roles.includes('sys_admin')) {
    return { view: true, create: true, edit: true, delete: true, execute: true };
  }
  
  const permissions: ActionPermission = {
    view: false,
    create: false,
    edit: false,
    delete: false,
    execute: false,
  };
  
  for (const role of roles) {
    const rolePerms = roleActionPermissions[role]?.[resource];
    if (rolePerms) {
      permissions.view = permissions.view || rolePerms.view;
      permissions.create = permissions.create || rolePerms.create;
      permissions.edit = permissions.edit || rolePerms.edit;
      permissions.delete = permissions.delete || rolePerms.delete;
      permissions.execute = permissions.execute || rolePerms.execute;
    }
  }
  
  return permissions;
}
