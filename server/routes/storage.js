import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Storage directory
const STORAGE_DIR = process.env.STORAGE_DIR || path.join(__dirname, '../../storage');
const PUBLIC_URL = process.env.PUBLIC_URL || 'http://localhost:3001';

// Bucket names: alphanumeric, hyphens, and underscores only (max 63 chars)
const BUCKET_NAME_RE = /^[a-zA-Z0-9_-]{1,63}$/;

function isValidBucket(name) {
  return typeof name === 'string' && BUCKET_NAME_RE.test(name);
}

// Ensure storage directory exists
async function ensureStorageDir() {
  try {
    await fs.mkdir(STORAGE_DIR, { recursive: true });
  } catch (error) {
    console.error('Failed to create storage directory:', error);
  }
}

ensureStorageDir();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const bucket = req.params.bucket || 'default';
    if (!isValidBucket(bucket)) {
      return cb(new Error('Invalid bucket name'));
    }
    const bucketPath = path.join(STORAGE_DIR, bucket);
    await fs.mkdir(bucketPath, { recursive: true });
    cb(null, bucketPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

// MIME type allowlist for file uploads
const ALLOWED_MIME_TYPES = new Set([
  // Images
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // Text
  'text/plain', 'text/csv',
  // Archives
  'application/zip',
]);

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} is not allowed`), false);
    }
  },
});

/**
 * Upload file (generic endpoint)
 * POST /api/storage/upload
 */
router.post('/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const bucket = req.body.bucket || 'default';
    if (!isValidBucket(bucket)) {
      return res.status(400).json({ error: 'Invalid bucket name' });
    }
    const filePath = req.file.path;
    const fileName = req.file.filename;
    const publicUrl = `${PUBLIC_URL}/api/storage/${bucket}/${fileName}`;

    res.json({
      url: publicUrl,
      path: fileName,
      fullPath: `${bucket}/${fileName}`,
      publicUrl,
      size: req.file.size,
      mimetype: req.file.mimetype,
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

/**
 * Upload file to bucket
 * POST /api/storage/:bucket/upload
 */
router.post('/:bucket/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!isValidBucket(req.params.bucket)) {
      return res.status(400).json({ error: 'Invalid bucket name' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const filePath = req.file.path;
    const fileName = req.file.filename;
    const publicUrl = `${PUBLIC_URL}/api/storage/${req.params.bucket}/${fileName}`;

    res.json({
      path: fileName,
      fullPath: `${req.params.bucket}/${fileName}`,
      publicUrl,
      size: req.file.size,
      mimetype: req.file.mimetype,
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

/**
 * Get public URL for file
 * GET /api/storage/:bucket/:path
 */
router.get('/:bucket/:path', optionalAuth, async (req, res) => {
  try {
    if (!isValidBucket(req.params.bucket)) {
      return res.status(400).json({ error: 'Invalid bucket name' });
    }
    const filePath = path.join(STORAGE_DIR, req.params.bucket, req.params.path);
    
    // Security: prevent directory traversal
    const normalizedPath = path.normalize(filePath);
    if (!normalizedPath.startsWith(path.normalize(STORAGE_DIR))) {
      return res.status(403).json({ error: 'Access denied' });
    }

    try {
      await fs.access(filePath);
      res.sendFile(filePath);
    } catch {
      res.status(404).json({ error: 'File not found' });
    }
  } catch (error) {
    console.error('File serve error:', error);
    res.status(500).json({ error: 'Failed to serve file' });
  }
});

/**
 * Delete file
 * DELETE /api/storage/:bucket/:path
 */
router.delete('/:bucket/:path', authenticateToken, async (req, res) => {
  try {
    if (!isValidBucket(req.params.bucket)) {
      return res.status(400).json({ error: 'Invalid bucket name' });
    }
    const filePath = path.join(STORAGE_DIR, req.params.bucket, req.params.path);
    
    // Security: prevent directory traversal
    const normalizedPath = path.normalize(filePath);
    if (!normalizedPath.startsWith(path.normalize(STORAGE_DIR))) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await fs.unlink(filePath);
    res.json({ success: true });
  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.status(404).json({ error: 'File not found' });
    }
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Delete failed' });
  }
});

/**
 * List files in bucket
 * GET /api/storage/:bucket
 */
router.get('/:bucket', optionalAuth, async (req, res) => {
  try {
    if (!isValidBucket(req.params.bucket)) {
      return res.status(400).json({ error: 'Invalid bucket name' });
    }
    const bucketPath = path.join(STORAGE_DIR, req.params.bucket);
    
    try {
      const files = await fs.readdir(bucketPath);
      const fileList = await Promise.all(
        files.map(async (file) => {
          const filePath = path.join(bucketPath, file);
          const stats = await fs.stat(filePath);
          return {
            name: file,
            size: stats.size,
            created: stats.birthtime,
            modified: stats.mtime,
            url: `${PUBLIC_URL}/api/storage/${req.params.bucket}/${file}`,
          };
        })
      );
      res.json({ files: fileList });
    } catch {
      res.json({ files: [] });
    }
  } catch (error) {
    console.error('List error:', error);
    res.status(500).json({ error: 'Failed to list files' });
  }
});

export default router;

