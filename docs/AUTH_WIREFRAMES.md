# Guardian Flow – Auth Wireframes & UI Comps (v1)

High-level, implementation-ready wireframes for unified platform and module-specific sign-in screens. Layout is powered by `ModularAuthLayout` with `EnhancedAuthForm`.

## Unified Platform Sign-in (/auth)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ [GF Icon]  Guardian Flow                                                 │
│           [Badge] Enterprise Operations & Intelligence Platform          │
│                                                                          │
│  Modular suite for field service, asset lifecycle, compliance,           │
│  forecasting, analytics, fraud forensics, and more.                      │
│                                                                          │
│  [✓] Enterprise SSO   [✓] Multi-Factor Auth   [✓] Passwordless           │
│  Support: support@guardianflow.com | Help & Documentation                │
│                                                                          │
│                        ┌───────────────────────────────┐                 │
│                        │  Sign In                      │                 │
│                        │  Access your Guardian Flow    │                 │
│                        │  account                      │                 │
│                        │  [ Email            ]         │                 │
│                        │  [ Password (👁)    ] (Caps?) │                 │
│                        │  (Forgot password)            │                 │
│                        │  [ Sign in ]   [ Create acc ] │                 │
│                        │  (Compliance notice when set) │                 │
│                        └───────────────────────────────┘                 │
└──────────────────────────────────────────────────────────────────────────┘
```

## Module Sign-in (examples)

- FSM (/auth/fsm)
  - Heading: Field Service Management
  - Tagline: Intelligent Work Order & Dispatch Platform
  - Icon: Factory

- Asset (/auth/asset)
  - Heading: Asset Lifecycle Management
  - Tagline: Complete Asset Tracking & Maintenance

- Analytics (/auth/analytics)
  - Heading: Enterprise Analytics Platform
  - Tagline: Data-Driven Insights & Intelligence

- Fraud (/auth/fraud)
  - Heading: Fraud Detection & Compliance
  - Tagline: Advanced Forensics & Risk Management
  - Compliance message visible in card

- Customer (/auth/customer)
  - Heading: Customer Portal
  - Tagline: Self-Service Excellence

All modules inherit:
- Gradient theme per module from `AUTH_MODULES`
- SSO/MFA/Passwordless badges based on config
- Support links (email/phone/help)
- White-label logo/company when provided via `getAuthConfig`

## Theming & Config
- Central config: `src/config/authConfig.ts` (module names, taglines, icons, gradients, support)
- White-label: `getAuthConfig(moduleId, whiteLabel)` to inject logo, company, support links, legal notice

## Accessibility & Mobile
- Single H1, clear hierarchy, keyboard focus order, ARIA labels in inputs
- Large tap targets, mobile-first layout

## Acceptance Tests
- Implemented in `tests/auth-ux.spec.ts` to validate presence of hero heading, sign-in card, inputs, and platform tagline across routes

## Notes
- SEO added at runtime: title, meta description, canonical in `ModularAuthLayout`
- Non-PII audit logging via `logAuthEvent` for page views and auth success
