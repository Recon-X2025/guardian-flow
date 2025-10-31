# Guardian Flow Deployment Guide

## Prerequisites
- Lovable project with Cloud enabled
- Environment variables from env_template.env

## Steps
1. Configure environment variables in Project Settings.
2. Publish from the top-right Publish button.
3. Backend functions deploy automatically; verify function logs via the backend panel.
4. (Optional) Enable Stripe integration and add test keys for billing features.

## Post-deploy
- Verify authentication flow
- Seed demo data from Forecast Center if needed
- Run 'Regenerate Forecasts Only' to enqueue jobs
