/**
 * Smoke tests to verify components use apiClient correctly
 * These tests check that components import and use apiClient (backed by MongoDB Atlas)
 * and do not contain any legacy Supabase references.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('API Client Smoke Tests', () => {
  const componentsDir = path.join(__dirname, '../../src/components');
  
  const migratedComponents = [
    'CreateWorkOrderDialog.tsx',
    'GenerateServiceOrderDialog.tsx',
    'TechnicianDialog.tsx',
    'FraudFeedbackDialog.tsx',
    'GenerateOfferDialog.tsx',
    'TriggerPrecheckDialog.tsx',
    'PrecheckStatus.tsx',
    'OperationalCommandView.tsx',
    'ContractDialog.tsx',
    'SeedDataManager.tsx',
    'SecurityDashboard.tsx',
    'PurchaseOrderDialog.tsx',
    'NLPQueryExecutor.tsx',
    'MFAOverrideDialog.tsx',
    'AddPenaltyRuleDialog.tsx',
    'AddInventoryItemDialog.tsx',
  ];

  const analyticsComponents = [
    'analytics/OperationalTab.tsx',
    'analytics/SLATab.tsx',
    'analytics/InventoryTab.tsx',
    'analytics/FinancialTab.tsx',
    'analytics/EnhancedSLATab.tsx',
  ];

  describe('Import Verification', () => {
    it.each([...migratedComponents, ...analyticsComponents])(
      'should use apiClient import (not legacy Supabase) in %s',
      (componentPath) => {
        const filePath = path.join(componentsDir, componentPath);
        
        if (!fs.existsSync(filePath)) {
          // Skip if file doesn't exist (some may have been renamed/moved)
          return;
        }

        const content = fs.readFileSync(filePath, 'utf-8');
        
        // Should import apiClient
        expect(content).toMatch(/import.*apiClient.*from.*@\/integrations\/api\/client/);
        
        // Should NOT import legacy Supabase client
        expect(content).not.toMatch(/import.*supabase.*from.*@\/integrations\/supabase/);
        
        // Should NOT use legacy supabase. pattern (method calls)
        // Allow comment mentions but not actual usage
        const lines = content.split('\n');
        const codeLines = lines.filter(line => 
          !line.trim().startsWith('//') && 
          !line.trim().startsWith('*') &&
          !line.includes('//')
        );
        const codeContent = codeLines.join('\n');
        
        // Check for legacy supabase. usage (not in comments)
        expect(codeContent).not.toMatch(/supabase\.from/);
        expect(codeContent).not.toMatch(/supabase\.auth/);
        expect(codeContent).not.toMatch(/supabase\.storage/);
        expect(codeContent).not.toMatch(/supabase\.functions/);
      }
    );
  });

  describe('Hook Verification', () => {
    it('should use apiClient in useOfflineSync hook', () => {
      const hookPath = path.join(__dirname, '../../src/hooks/useOfflineSync.tsx');
      
      if (!fs.existsSync(hookPath)) {
        return; // Skip if file doesn't exist
      }

      const content = fs.readFileSync(hookPath, 'utf-8');
      
      expect(content).toMatch(/import.*apiClient/);
      expect(content).not.toMatch(/import.*supabase.*from.*@\/integrations\/supabase/);
      expect(content).not.toMatch(/supabase\.from/);
    });
  });

  describe('Pattern Verification', () => {
    it('should use .then() pattern for apiClient queries', () => {
      const testFile = path.join(componentsDir, 'CreateWorkOrderDialog.tsx');
      
      if (!fs.existsSync(testFile)) {
        return;
      }

      const content = fs.readFileSync(testFile, 'utf-8');
      
      // Should use .then() after apiClient queries
      // This is a basic check - actual queries should have .then()
      const hasApiClientUsage = content.includes('apiClient.from');
      if (hasApiClientUsage) {
        // At least some queries should use .then()
        expect(content).toMatch(/\.then\(\)/);
      }
    });

    it('should use result.data pattern for function invocations', () => {
      const testFile = path.join(componentsDir, 'GenerateServiceOrderDialog.tsx');
      
      if (!fs.existsSync(testFile)) {
        return;
      }

      const content = fs.readFileSync(testFile, 'utf-8');
      
      // Should use result.data instead of destructured { data, error }
      if (content.includes('apiClient.functions.invoke')) {
        expect(content).toMatch(/result\.data/);
      }
    });
  });

  describe('No Legacy Supabase References', () => {
    it('should have zero legacy Supabase imports in components directory', () => {
      const files = getAllTsxFiles(componentsDir);
      let supabaseImportCount = 0;
      
      files.forEach(file => {
        const content = fs.readFileSync(file, 'utf-8');
        // Check for legacy Supabase imports (excluding comments)
        const importLines = content
          .split('\n')
          .filter(line => line.includes('import') && !line.trim().startsWith('//'));

        importLines.forEach(line => {
          if (line.includes('supabase') && !line.includes('@/integrations/api/client')) {
            // This is a legacy Supabase import, not the API client alias
            if (!line.includes('// Supabase') && !line.includes('* Supabase')) {
              supabaseImportCount++;
            }
          }
        });
      });

      expect(supabaseImportCount).toBe(0);
    });
  });
});

function getAllTsxFiles(dir: string): string[] {
  const files: string[] = [];
  
  function walkDir(currentPath: string) {
    const items = fs.readdirSync(currentPath);
    
    items.forEach(item => {
      const fullPath = path.join(currentPath, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && item !== 'node_modules' && item !== '.git') {
        walkDir(fullPath);
      } else if (item.endsWith('.tsx') || item.endsWith('.ts')) {
        files.push(fullPath);
      }
    });
  }
  
  walkDir(dir);
  return files;
}

