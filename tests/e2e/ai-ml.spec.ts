import { test, expect } from '@playwright/test';
import { navigateAuthenticated, expectPageLoaded } from './helpers';

test.describe('AI & Machine Learning', () => {
  // F-AI-001: Demand Forecasting
  test.describe('F-AI-001: Demand Forecasting', () => {
    test('loads forecast center', async ({ page }) => {
      await navigateAuthenticated(page, '/forecast');
      await expectPageLoaded(page, /forecast/i);
    });
  });

  // F-AI-002: SLA Breach Prediction
  test.describe('F-AI-002: SLA Breach Prediction', () => {
    test('analytics page loads with SLA data', async ({ page }) => {
      await navigateAuthenticated(page, '/analytics');
      await expectPageLoaded(page, /analytics/i);
    });
  });

  // F-AI-003: Equipment Failure Prediction
  test.describe('F-AI-003: Equipment Failure Prediction', () => {
    test('loads predictive maintenance page', async ({ page }) => {
      await navigateAuthenticated(page, '/predictive-maintenance');
      await expectPageLoaded(page, /predict|maintenance/i);
    });
  });

  // F-AI-004: Agent Orchestration
  test.describe('F-AI-004: Agent Orchestration', () => {
    test('loads agent dashboard', async ({ page }) => {
      await navigateAuthenticated(page, '/agent-dashboard');
      await expectPageLoaded(page, /agent/i);
    });

    test('loads model orchestration page', async ({ page }) => {
      await navigateAuthenticated(page, '/models');
      await expectPageLoaded(page, /model|orchestr/i);
    });
  });

  // AI Assistant & NLP
  test.describe('AI Assistant & NLP', () => {
    test('loads assistant page', async ({ page }) => {
      await navigateAuthenticated(page, '/assistant');
      await expectPageLoaded(page, /assistant/i);
    });

    test('loads NLP query interface', async ({ page }) => {
      await navigateAuthenticated(page, '/nlp-query');
      await expectPageLoaded(page, /query|nlp/i);
    });

    test('loads offer AI page', async ({ page }) => {
      await navigateAuthenticated(page, '/sapos');
      await expectPageLoaded(page);
    });

    test('loads prompts page', async ({ page }) => {
      await navigateAuthenticated(page, '/prompts');
      await expectPageLoaded(page, /prompt/i);
    });
  });

  // Knowledge Base & RAG
  test.describe('Knowledge Base & RAG', () => {
    test('loads knowledge base page', async ({ page }) => {
      await navigateAuthenticated(page, '/knowledge-base');
      await expectPageLoaded(page, /knowledge/i);
    });

    test('loads RAG engine page', async ({ page }) => {
      await navigateAuthenticated(page, '/rag');
      await expectPageLoaded(page, /rag|engine/i);
    });

    test('loads FAQ page', async ({ page }) => {
      await navigateAuthenticated(page, '/faq');
      await expectPageLoaded(page, /faq|question/i);
    });
  });
});
