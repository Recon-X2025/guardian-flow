# Technology Stack and Dependencies

**Guardian Flow v6.1.0**  
**Date:** November 1, 2025

---

## Table of Contents

1. [Technology Overview](#technology-overview)
2. [Frontend Stack](#frontend-stack)
3. [Backend Stack](#backend-stack)
4. [Database and Storage](#database-and-storage)
5. [AI and Machine Learning](#ai-and-machine-learning)
6. [DevOps and Infrastructure](#devops-and-infrastructure)
7. [Third-Party Integrations](#third-party-integrations)
8. [Development Tools](#development-tools)
9. [Security Dependencies](#security-dependencies)
10. [Version Management](#version-management)

---

## Technology Overview

Guardian Flow leverages modern, battle-tested technologies to deliver a robust, scalable, and maintainable platform.

### Core Technology Decisions

| Category | Technology | Rationale |
|----------|-----------|-----------|
| **Frontend Framework** | React 18.3 | Component-based, large ecosystem, excellent performance |
| **Language** | TypeScript 5.x | Type safety, better developer experience, fewer runtime errors |
| **Build Tool** | Vite 5.x | Fast builds, hot module replacement, modern bundling |
| **Backend** | Express.js + Node.js | Full-stack platform, flexible, scalable |
| **Database** | MongoDB Atlas 7.x | Document store, flexible schema, global clusters |
| **Styling** | Tailwind CSS 3.x | Utility-first, rapid development, consistent design |
| **State Management** | TanStack Query 5.x | Server state management, caching, automatic refetching |
| **AI/ML** | Google Gemini, OpenAI GPT | Advanced AI capabilities, multimodal support |

---

## Frontend Stack

### Core Framework

**React 18.3.1**
- Purpose: UI framework
- Features: Concurrent rendering, automatic batching, transitions
- License: MIT

**TypeScript 5.x**
- Purpose: Type-safe JavaScript
- Features: Static typing, interfaces, generics
- License: Apache 2.0

**Vite 5.x**
- Purpose: Build tool and dev server
- Features: Lightning-fast HMR, optimized builds, plugin ecosystem
- License: MIT

### UI Component Libraries

**Radix UI**
- Purpose: Unstyled, accessible UI primitives
- Components: Dialog, Dropdown, Popover, Toast, etc.
- License: MIT
- Version: Various (see package.json)

```json
{
  "@radix-ui/react-dialog": "^1.1.14",
  "@radix-ui/react-dropdown-menu": "^2.1.15",
  "@radix-ui/react-popover": "^1.1.14",
  "@radix-ui/react-toast": "^1.2.14"
}
```

**shadcn/ui**
- Purpose: Pre-built accessible components
- Customization: Full control via source
- License: MIT

### Styling

**Tailwind CSS 3.x**
- Purpose: Utility-first CSS framework
- Configuration: Custom design system
- Plugins: tailwindcss-animate
- License: MIT

**class-variance-authority**
- Purpose: Component variant management
- Use Case: Button variants, card styles
- License: Apache 2.0

**clsx / tailwind-merge**
- Purpose: Conditional className composition
- Use Case: Dynamic styling
- License: MIT

### State Management

**TanStack Query 5.83**
- Purpose: Server state management
- Features: Caching, automatic refetching, optimistic updates
- License: MIT

**React Context API**
- Purpose: Global state (auth, RBAC)
- Components: AuthContext, RBACContext
- Built-in: No external dependency

### Routing

**React Router DOM 6.30**
- Purpose: Client-side routing
- Features: Nested routes, data loading, protected routes
- License: MIT

### Form Management

**React Hook Form 7.61**
- Purpose: Form state and validation
- Features: Uncontrolled components, minimal re-renders
- License: MIT

**Zod 3.25**
- Purpose: Schema validation
- Use Case: Form validation, API input validation
- License: MIT

**@hookform/resolvers**
- Purpose: Validation resolver for React Hook Form
- Integration: Zod validation
- License: MIT

### Data Visualization

**Recharts 2.15**
- Purpose: Charts and graphs
- Features: Responsive, customizable, built on D3
- License: MIT

### Date/Time Handling

**date-fns 3.6**
- Purpose: Date manipulation and formatting
- Features: Immutable, tree-shakeable, timezone support
- License: MIT

**react-day-picker 8.10**
- Purpose: Date picker component
- Integration: Used in Calendar UI
- License: MIT

### Icons

**Lucide React 0.462**
- Purpose: Icon library
- Features: Consistent design, tree-shakeable
- License: ISC

### UI Utilities

**sonner 1.7**
- Purpose: Toast notifications
- Features: Beautiful, customizable, accessible
- License: MIT

**vaul 0.9**
- Purpose: Drawer component
- Features: Mobile-friendly, gesture support
- License: MIT

**cmdk 1.1**
- Purpose: Command palette
- Features: Fuzzy search, keyboard navigation
- License: MIT

**embla-carousel-react 8.6**
- Purpose: Carousel/slider component
- Features: Touch-enabled, performant
- License: MIT

### Security

**DOMPurify 3.3**
- Purpose: XSS sanitization
- Use Case: Sanitizing user-generated HTML
- License: Apache 2.0 / MPL 2.0

### PDF Generation

**jsPDF 3.0**
- Purpose: Client-side PDF generation
- Use Case: Invoices, reports, work orders
- License: MIT

---

## Backend Stack

### Platform

**Express.js + Node.js**
- Purpose: Backend server framework
- Features: RESTful APIs, middleware support, flexible routing
- Runtime: Node.js 18+
- License: MIT

### Database Driver

**mongodb 6.3+**
- Purpose: Native MongoDB driver
- Features: Connection pooling, async operations, aggregation
- Version: 6.3+
- License: Apache 2.0

---

## Database and Storage

### Database

**MongoDB Atlas 7.x**
- Purpose: Primary database
- Features: Document store, flexible schema, aggregation pipeline, indexes
- Hosting: MongoDB Atlas (managed cloud)
- License: Server Side Public License (SSPL)

**Database Features**
- TTL indexes: Automatic document expiration
- Text indexes: Full-text search
- Compound indexes: Multi-field query optimization

### Storage

**Disk-based Storage (Multer)**
- Purpose: File and object storage
- Features: File uploads, MIME type validation
- Location: Server file system
- License: MIT

### Caching

**In-memory Caching**
- Purpose: Query performance optimization
- Implementation: Token blacklist, session cache
- Built-in: No external cache needed for current scale

---

## AI and Machine Learning

### AI Providers

**Google Gemini**
- Models: gemini-2.5-pro, gemini-2.5-flash, gemini-2.5-flash-lite
- Use Cases: Forecasting, document analysis, fraud detection
- Integration: Lovable AI (no API key required)

**OpenAI GPT**
- Models: gpt-5, gpt-5-mini, gpt-5-nano
- Use Cases: Natural language processing, SaPOS assistance
- Integration: Lovable AI (no API key required)

### ML Libraries

**Custom Algorithms**
- MinT Reconciliation: Forecast hierarchy reconciliation
- Anomaly Detection: Statistical outlier detection
- Time Series: Demand forecasting models

---

## DevOps and Infrastructure

### Version Control

**Git**
- Purpose: Source code management
- Hosting: GitHub integration via Lovable
- Branching: Main branch with feature branches

### CI/CD

**Lovable Cloud**
- Purpose: Automated deployments
- Features: Preview builds, production deploys, Express.js route handler deployment
- Trigger: Git push

### Hosting

**Lovable Cloud**
- Purpose: Application hosting
- Features: CDN, SSL, custom domains
- Regions: Multi-region support

**Express.js Backend (Self-hosted)**
- Purpose: Backend hosting
- Features: API routes, middleware, database access
- Regions: Configurable based on deployment

### Monitoring

**MongoDB Atlas Dashboard**
- Purpose: Backend observability
- Metrics: Database performance, query logs, connection stats
- Alerts: Configurable

**Custom Telemetry**
- Purpose: Application metrics
- Implementation: Express.js route handler telemetry
- Storage: Database tables

---

## Third-Party Integrations

### Current Integrations

**Stripe (Optional)**
- Purpose: Payment processing
- Features: Subscriptions, invoicing
- SDK: Stripe API
- License: Proprietary

**Shopify (Optional)**
- Purpose: E-commerce integration
- Features: Product sync, order management
- SDK: Shopify API
- License: Proprietary

### Planned Integrations

- ERP Systems (SAP, Oracle, Microsoft Dynamics)
- SIEM Tools (Splunk, IBM QRadar, Azure Sentinel)
- Calendar Services (Google Calendar, Microsoft Outlook)
- Mapping Services (Google Maps, Mapbox)

---

## Development Tools

### Testing

**Playwright 1.55**
- Purpose: End-to-end testing
- Features: Cross-browser, auto-wait, screenshots
- License: Apache 2.0

**Test Files**
```
tests/
├── comprehensive-functionality.spec.ts
├── functional-test.spec.ts
├── rbac.spec.ts
└── tenant-isolation.spec.ts
```

### Code Quality

**ESLint**
- Purpose: JavaScript/TypeScript linting
- Configuration: Custom rules
- License: MIT

**TypeScript Compiler**
- Purpose: Type checking
- Configuration: tsconfig.json
- License: Apache 2.0

### Package Management

**npm**
- Purpose: Dependency management
- Lock File: package-lock.json
- Registry: npmjs.com

---

## Security Dependencies

### Authentication

**Custom JWT Auth**
- Purpose: User authentication
- Features: JWT tokens, OAuth (planned), MFA
- Built-in: Part of Express.js backend

### Authorization

**Custom RBAC System**
- Implementation: Application-level middleware with tenant isolation
- Collections: `user_roles`, `role_permissions`, `permissions`
- No external dependency

### Encryption

**MongoDB Atlas Encryption**
- Purpose: Database encryption
- Features: Field-level encryption, client-side encryption
- Built-in: MongoDB Atlas feature

### Sanitization

**DOMPurify 3.3**
- Purpose: XSS prevention
- Use Case: User-generated content
- License: Apache 2.0 / MPL 2.0

---

## Version Management

### Frontend Dependencies

**Production Dependencies**
```json
{
  "react": "^18.3.1",
  "react-dom": "^18.3.1",
  "react-router-dom": "^6.30.1",
  "@tanstack/react-query": "^5.83.0",
  "react-hook-form": "^7.61.1",
  "zod": "^3.25.76",
  "tailwindcss": "latest",
  "recharts": "^2.15.4",
  "lucide-react": "^0.462.0",
  "date-fns": "^3.6.0",
  "sonner": "^1.7.4"
}
```

**Development Dependencies**
```json
{
  "@playwright/test": "^1.55.1",
  "typescript": "^5.x",
  "vite": "^5.x",
  "eslint": "latest"
}
```

### Backend Dependencies

**Express.js Backend**
- Package management via npm (server/package.json)
- Shared code in `server/services/` and `server/middleware/`
- Standard library: Node.js built-ins

### Update Strategy

**Versioning Policy**
- Major versions: Planned upgrades with testing
- Minor versions: Regular updates (monthly)
- Patch versions: Applied automatically for security

**Deprecation Policy**
- 6-month notice for major breaking changes
- Migration guides provided
- Backward compatibility maintained when possible

---

## Dependency Security

### Security Scanning

**npm audit**
- Purpose: Vulnerability scanning
- Schedule: On every install
- Action: Auto-fix when safe

**Dependency Review**
- Process: Manual review for new dependencies
- Criteria: License, maintenance, security track record

### Supply Chain Security

**Lock Files**
- Purpose: Ensure reproducible builds
- File: package-lock.json
- Committed: Yes

**License Compliance**
- Allowed: MIT, Apache 2.0, BSD, ISC
- Review: All new dependencies
- Documentation: This file

---

## Performance Considerations

### Bundle Size Optimization

**Code Splitting**
- Route-based splitting
- Dynamic imports for heavy components
- Lazy loading

**Tree Shaking**
- Enabled via Vite
- ESM-only dependencies preferred
- Dead code elimination

### Runtime Performance

**React Performance**
- Memoization (useMemo, useCallback)
- Virtual scrolling for large lists
- Debouncing for inputs

**Database Performance**
- Connection pooling
- Indexed queries
- Materialized views for analytics

---

## Conclusion

Guardian Flow's technology stack is carefully chosen to provide:
- **Developer Experience**: Modern tooling, type safety
- **Performance**: Fast builds, optimized runtime
- **Scalability**: Horizontal scaling, serverless
- **Security**: Best-in-class security practices
- **Maintainability**: Well-documented, active communities

All dependencies are actively maintained and receive regular security updates.
