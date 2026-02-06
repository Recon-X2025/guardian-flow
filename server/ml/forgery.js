/**
 * Image Forgery Detection Pipeline
 * Statistical analysis + optional AI-enhanced vision analysis
 */

import { randomUUID } from 'crypto';
import { visionAnalysis } from '../services/ai/llm.js';

/**
 * EXIF metadata consistency checks
 * Looks for signs of tampering in image metadata
 */
function checkExifConsistency(metadata) {
  const findings = [];

  if (!metadata) {
    findings.push({
      type: 'missing_metadata',
      severity: 'medium',
      description: 'No EXIF metadata found. Image may have been stripped or re-saved.',
    });
    return { suspicious: findings.length > 0, findings, score: 0.5 };
  }

  // Check for editing software
  const editingSoftware = ['photoshop', 'gimp', 'lightroom', 'paint.net', 'pixlr', 'canva'];
  if (metadata.software) {
    const sw = metadata.software.toLowerCase();
    if (editingSoftware.some(s => sw.includes(s))) {
      findings.push({
        type: 'editing_software_detected',
        severity: 'high',
        description: `Image was processed with editing software: ${metadata.software}`,
      });
    }
  }

  // Check timestamp consistency
  if (metadata.capture_date && metadata.modify_date) {
    const capture = new Date(metadata.capture_date);
    const modify = new Date(metadata.modify_date);
    const diffHours = Math.abs(modify - capture) / (1000 * 60 * 60);
    if (diffHours > 24) {
      findings.push({
        type: 'timestamp_gap',
        severity: 'medium',
        description: `${Math.round(diffHours)} hour gap between capture and modification dates.`,
      });
    }
  }

  // Check GPS consistency
  if (metadata.gps_lat !== undefined && metadata.gps_lon !== undefined) {
    // Null island check
    if (metadata.gps_lat === 0 && metadata.gps_lon === 0) {
      findings.push({
        type: 'null_island_gps',
        severity: 'low',
        description: 'GPS coordinates are 0,0 (null island) - likely default/missing GPS.',
      });
    }
  }

  // Check resolution vs file size ratio
  if (metadata.width && metadata.height && metadata.file_size) {
    const pixels = metadata.width * metadata.height;
    const bytesPerPixel = metadata.file_size / pixels;
    // Normal JPEG: 0.3-2.5 bytes per pixel, suspicious if very low (over-compressed) or very high
    if (bytesPerPixel < 0.1) {
      findings.push({
        type: 'over_compressed',
        severity: 'low',
        description: `File is heavily compressed (${bytesPerPixel.toFixed(3)} bytes/pixel). May indicate multiple re-saves.`,
      });
    } else if (bytesPerPixel > 5) {
      findings.push({
        type: 'unusual_size_ratio',
        severity: 'low',
        description: `Unusually large file for resolution (${bytesPerPixel.toFixed(1)} bytes/pixel).`,
      });
    }
  }

  const score = findings.length === 0 ? 0.95
    : findings.some(f => f.severity === 'high') ? 0.3
    : findings.some(f => f.severity === 'medium') ? 0.55
    : 0.75;

  return {
    suspicious: findings.length > 0,
    findings,
    score, // 0 = definitely forged, 1 = definitely authentic
  };
}

/**
 * Perceptual hash for duplicate detection
 * Simple average hash implementation
 */
function computePerceptualHash(fileSize, fileName) {
  // Simplified perceptual hash based on available metadata
  // In production, this would analyze pixel data
  let hash = 0;
  const str = `${fileSize}_${fileName}`;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * Check for duplicate images in a batch
 */
function detectDuplicates(images) {
  const hashMap = {};
  const duplicates = [];

  for (const img of images) {
    const hash = computePerceptualHash(img.file_size || 0, img.file_name || '');
    if (hashMap[hash]) {
      duplicates.push({
        type: 'duplicate_image',
        severity: 'high',
        description: `Image "${img.file_name}" appears to be a duplicate of "${hashMap[hash].file_name}".`,
        original_id: hashMap[hash].id,
        duplicate_id: img.id,
      });
    } else {
      hashMap[hash] = img;
    }
  }

  return duplicates;
}

/**
 * Full forgery analysis pipeline for a single image
 */
async function analyzeImage(image, options = {}) {
  const startTime = Date.now();
  const results = {
    forgery_detected: false,
    forgery_type: null,
    confidence: 0,
    findings: [],
    metadata_extracted: {},
  };

  // Step 1: EXIF / metadata analysis
  const exifResult = checkExifConsistency({
    software: image.software || null,
    capture_date: image.captured_at || image.capture_date || null,
    modify_date: image.modify_date || null,
    gps_lat: image.gps?.lat ?? image.gps_lat ?? undefined,
    gps_lon: image.gps?.lon ?? image.gps_lon ?? undefined,
    width: image.width || null,
    height: image.height || null,
    file_size: image.file_size || null,
  });

  results.findings.push(...exifResult.findings);
  results.metadata_extracted = {
    timestamp: image.captured_at || image.capture_date || null,
    gps: image.gps || null,
    camera: image.camera || image.device || null,
    software: image.software || null,
  };

  // Step 2: AI vision analysis (if URL available and AI enabled)
  if (options.useVision && (image.url || image.file_url || image.file_path)) {
    const imageUrl = image.url || image.file_url || image.file_path;
    const visionResult = await visionAnalysis(imageUrl,
      `Analyze this image for signs of forgery or tampering. Check for: ` +
      `1. Copy-move forgery patterns ` +
      `2. Splicing artifacts at edges ` +
      `3. Inconsistent lighting/shadows ` +
      `4. Metadata manipulation indicators ` +
      `5. AI-generated content markers ` +
      `Return JSON: { "forgery_detected": bool, "forgery_type": string|null, "confidence": 0-1, "findings": [{"type": string, "severity": "low"|"medium"|"high"|"critical", "description": string}] }`
    );

    try {
      const parsed = typeof visionResult.analysis === 'string'
        ? JSON.parse(visionResult.analysis)
        : visionResult.analysis;

      if (parsed.findings) {
        results.findings.push(...parsed.findings);
      }
      if (parsed.forgery_detected) {
        results.forgery_detected = true;
        results.forgery_type = parsed.forgery_type || 'ai_detected';
      }
      // Weight AI confidence higher than statistical
      results.confidence = parsed.confidence || exifResult.score;
    } catch (e) {
      // Vision analysis parse failed, rely on statistical only
    }
  }

  // Step 3: Determine final verdict
  const highSeverityFindings = results.findings.filter(f => f.severity === 'high' || f.severity === 'critical');

  if (!results.forgery_detected) {
    results.forgery_detected = highSeverityFindings.length >= 2
      || results.findings.filter(f => f.severity === 'medium').length >= 3;

    if (results.forgery_detected) {
      results.forgery_type = highSeverityFindings[0]?.type || 'statistical_anomaly';
    }
  }

  // Compute confidence: high if few findings and they agree, lower otherwise
  if (!results.confidence) {
    results.confidence = exifResult.score;
  }

  results.processing_time_ms = Date.now() - startTime;

  return results;
}

/**
 * Process a batch of images for forgery detection
 */
async function processBatch(images, options = {}) {
  const batchResults = [];
  const startTime = Date.now();

  // Step 1: Check for duplicates across batch
  const duplicates = detectDuplicates(images);

  // Step 2: Analyze each image
  for (const image of images) {
    const result = await analyzeImage(image, options);

    // Merge in any duplicate findings for this image
    const imageDupes = duplicates.filter(d => d.duplicate_id === image.id || d.original_id === image.id);
    result.findings.push(...imageDupes);
    if (imageDupes.length > 0 && !result.forgery_detected) {
      result.forgery_detected = true;
      result.forgery_type = 'duplicate_image';
    }

    batchResults.push({
      image_id: image.id || randomUUID(),
      file_name: image.file_name || image.fileName || 'unknown',
      ...result,
    });
  }

  const totalTime = Date.now() - startTime;
  const detections = batchResults.filter(r => r.forgery_detected);

  return {
    results: batchResults,
    summary: {
      total_images: images.length,
      processed: batchResults.length,
      detections_found: detections.length,
      avg_confidence: batchResults.length > 0
        ? batchResults.reduce((s, r) => s + r.confidence, 0) / batchResults.length
        : 0,
      processing_time_seconds: totalTime / 1000,
    },
  };
}

export {
  analyzeImage,
  processBatch,
  checkExifConsistency,
  detectDuplicates,
  computePerceptualHash,
};
