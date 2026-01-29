// Pages
export { default as Auth } from './pages/Auth';
export { default as UnifiedPlatformAuth } from './pages/auth/UnifiedPlatformAuth';
export { default as FSMAuth } from './pages/auth/FSMAuth';
export { default as AssetAuth } from './pages/auth/AssetAuth';
export { default as ForecastingAuth } from './pages/auth/ForecastingAuth';
export { default as FraudAuth } from './pages/auth/FraudAuth';
export { default as MarketplaceAuth } from './pages/auth/MarketplaceAuth';
export { default as AnalyticsAuth } from './pages/auth/AnalyticsAuth';
export { default as CustomerAuth } from './pages/auth/CustomerAuth';
export { default as TrainingAuth } from './pages/auth/TrainingAuth';

// Components
export * from './components/auth/EnhancedAuthForm';
export * from './components/auth/ModularAuthLayout';
export * from './components/ProtectedRoute';
export * from './components/RoleGuard';
export * from './components/ProtectedAction';
export * from './components/MFADialog';
export * from './components/MFAOverrideDialog';
export * from './components/AccessDenied';

// Contexts
export * from './contexts/AuthContext';
export * from './contexts/RBACContext';

// Hooks
export * from './hooks/useActionPermissions';
export * from './hooks/useAuthAudit';

// Lib
export * from './lib/authRedirects';

// Config
export * from './config/rolePermissions';
export * from './config/authConfig';
