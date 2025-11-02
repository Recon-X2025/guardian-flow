# Module RBAC Test Matrix - One Role Per Module Type

## Test Accounts for Each Module Category

### ✅ **Core Modules**
| Module | Test Account | Role | Password | What to Verify |
|--------|--------------|------|----------|----------------|
| **Dashboard** | client_finance_manager@client.com | client_finance_manager | Client123! | Dashboard visible |
| **Tickets** | ops@techcorp.com | ops_manager | Ops123! | Tickets menu visible |
| **Work Orders** | insurance1.admin@client.com | client_admin | Client123! | Work Orders visible ✅ |
| **Photo Capture** | tech.photos@techcorp.com | technician | Tech123! | Photo Capture visible |
| **Service Orders** | ops@techcorp.com | ops_manager | Ops123! | Service Orders visible |

### ✅ **Operations Modules**
| Module | Test Account | Role | Password | What to Verify |
|--------|--------------|------|----------|----------------|
| **Pending Validation** | auditor@techcorp.com | auditor | Auditor123! | Pending Validation visible |
| **Scheduler** | dispatch@techcorp.com | dispatcher | Dispatch123! | Scheduler visible |
| **Dispatch** | dispatch@techcorp.com | dispatcher | Dispatch123! | Dispatch menu visible |
| **Route Optimization** | dispatch@techcorp.com | dispatcher | Dispatch123! | Route Optimization visible |
| **Inventory** | ops@techcorp.com | ops_manager | Ops123! | Inventory menu visible |
| **Procurement** | oem1.procurement@client.com | client_procurement_manager | Client123! | Procurement visible |
| **Warranty & RMA** | warranty@techcorp.com (if exists) | ops_manager | Ops123! | Warranty menu visible |

### ✅ **Financial Modules**
| Module | Test Account | Role | Password | What to Verify |
|--------|--------------|------|----------|----------------|
| **Quotes** | finance@techcorp.com | finance_manager | Finance123! | Quotes menu visible |
| **Invoicing** | finance@techcorp.com | finance_manager | Finance123! | Invoicing visible |
| **Payments** | finance@techcorp.com | finance_manager | Finance123! | Payments visible |
| **Finance** | healthcare1.finance@client.com | client_finance_manager | Client123! | Finance visible |
| **Penalties** | finance@techcorp.com | finance_manager | Finance123! | Penalties visible |

### ✅ **AI & Automation Modules**
| Module | Test Account | Role | Password | What to Verify |
|--------|--------------|------|----------|----------------|
| **Offer AI (SaPOS)** | ops@techcorp.com | ops_manager | Ops123! | Offer AI visible |
| **Knowledge Base** | admin@techcorp.com | sys_admin | Admin123! | Knowledge Base visible |
| **RAG Engine** | admin@techcorp.com | sys_admin | Admin123! | RAG Engine visible |
| **Assistant** | admin@techcorp.com | sys_admin | Admin123! | Assistant visible |
| **Model Orchestration** | ml@techcorp.com | ml_ops | MLOps123! | Model Orchestration visible |
| **Prompts** | admin@techcorp.com | sys_admin | Admin123! | Prompts visible |

### ✅ **Analytics Modules**
| Module | Test Account | Role | Password | What to Verify |
|--------|--------------|------|----------|----------------|
| **Analytics** | auditor@techcorp.com | auditor | Auditor123! | Analytics visible |
| **Forecast Center** | finance@techcorp.com | finance_manager | Finance123! | Forecast visible |
| **Fraud Detection** | fraud@techcorp.com | fraud_investigator | Fraud123! | Fraud Detection visible |
| **Forgery Detection** | fraud@techcorp.com | fraud_investigator | Fraud123! | Forgery Detection visible |
| **Anomaly Detection** | fraud@techcorp.com | fraud_investigator | Fraud123! | Anomaly Detection visible |
| **Observability** | auditor@techcorp.com | auditor | Auditor123! | Observability visible |

### ✅ **Developer Modules**
| Module | Test Account | Role | Password | What to Verify |
|--------|--------------|------|----------|----------------|
| **Developer Console** | admin@techcorp.com | sys_admin | Admin123! | Developer Console visible |
| **Developer Portal** | admin@servicepro.com | partner_admin | Partner123! | Developer Portal visible |
| **Industry Workflows** | ops@techcorp.com | ops_manager | Ops123! | Industry Workflows visible |
| **Marketplace** | admin@techcorp.com | sys_admin | Admin123! | Marketplace visible |
| **Marketplace Management** | admin@techcorp.com | sys_admin | Admin123! | Marketplace Mgmt visible |
| **Platform Metrics** | admin@techcorp.com | sys_admin | Admin123! | Platform Metrics visible |
| **Analytics Integrations** | admin@techcorp.com | sys_admin | Admin123! | Analytics Integrations visible |

### ✅ **System Modules**
| Module | Test Account | Role | Password | What to Verify |
|--------|--------------|------|----------|----------------|
| **Documents** | auditor@techcorp.com | auditor | Auditor123! | Documents visible |
| **Templates** | admin@techcorp.com | sys_admin | Admin123! | Templates visible |
| **Admin Console** | admin@techcorp.com | sys_admin | Admin123! | Admin Console visible |
| **Compliance Center** | healthcare1.compliance@client.com | client_compliance_officer | Client123! | Compliance visible |
| **System Health** | admin@techcorp.com | sys_admin | Admin123! | System Health visible |
| **Help & Training** | All users | Any | - | Help & Training visible |
| **Settings** | All users | Any | - | Settings visible |

---

## Quick Test Checklist

**Test these 7 key roles across all module categories:**

1. ✅ **admin@techcorp.com** (sys_admin) - Should see everything
2. ✅ **ops@techcorp.com** (ops_manager) - Core ops, tickets, WOs, dispatch, inventory
3. ✅ **finance@techcorp.com** (finance_manager) - Financial modules
4. ✅ **fraud@techcorp.com** (fraud_investigator) - Fraud, anomaly, forgery
5. ✅ **dispatch@techcorp.com** (dispatcher) - Scheduler, dispatch, routes
6. ✅ **insurance1.admin@client.com** (client_admin) - Client-side modules ✅
7. ✅ **admin@servicepro.com** (partner_admin) - Partner portal, developer tools

---

## Expected Results

- Each role should **only** see modules they have permissions for
- Modules should load without errors
- Sidebar should dynamically filter based on RBAC
- No 406/403/404 errors in console
- Console should show correct permission count for each role

