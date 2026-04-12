/**
 * @file server/jobs/handlers/compliance-cert-monitor.js
 * @description Cron job handler — Sprint 36.
 *
 * Scans all asset_compliance_certs and updates status:
 *  - expired      → expiryDate is in the past
 *  - expiring_soon → expiryDate within 30 days
 *  - valid        → otherwise
 *
 * Returns count of updated records.
 */

import { getAdapter } from '../../db/factory.js';
import logger from '../../utils/logger.js';

const CERTS_COL          = 'asset_compliance_certs';
const EXPIRY_WARN_MS     = 30 * 24 * 60 * 60 * 1000; // 30 days in ms

export async function runComplianceCertMonitor() {
  const adapter = await getAdapter();
  const certs   = await adapter.findMany(CERTS_COL, {});

  const now = Date.now();
  let updated = 0;

  for (const cert of certs) {
    if (!cert.expiryDate) continue;

    const expiry    = new Date(cert.expiryDate).getTime();
    const diff      = expiry - now;
    let newStatus;

    if (diff <= 0) {
      newStatus = 'expired';
    } else if (diff <= EXPIRY_WARN_MS) {
      newStatus = 'expiring_soon';
    } else {
      newStatus = 'valid';
    }

    if (cert.status !== newStatus) {
      await adapter.updateOne(
        CERTS_COL,
        { id: cert.id },
        { status: newStatus, updatedAt: new Date().toISOString() },
      );
      updated++;
      logger.info('ComplianceCertMonitor: status updated', {
        certId:    cert.id,
        assetId:   cert.assetId,
        oldStatus: cert.status,
        newStatus,
      });
    }
  }

  logger.info('ComplianceCertMonitor: scan complete', { total: certs.length, updated });
  return { total: certs.length, updated };
}

export default runComplianceCertMonitor;
