import express from 'express';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.get('/sdk/download', authenticateToken, (req, res) => {
  res.json({
    version: '1.0.0',
    downloadUrl: '/sdk/js/guardianflow-sdk.js',
    typesUrl: '/sdk/js/types.d.ts',
    readmeUrl: '/sdk/README.md',
  });
});

export default router;
