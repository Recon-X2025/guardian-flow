import logger from '../utils/logger.js';

export function validate(schema) {
  return async (req, res, next) => {
    try {
      const validated = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      req.body = validated.body ?? req.body;
      req.query = validated.query ?? req.query;
      req.params = validated.params ?? req.params;
      next();
    } catch (error) {
      if (error.errors) {
        const details = error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        logger.warn('Validation failed', { errors: details, path: req.path });
        return res.status(400).json({ error: 'Validation failed', details });
      }
      next(error);
    }
  };
}
