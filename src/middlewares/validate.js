import ApiError from '../utils/ApiError.js';

// Validates req.body against a Zod schema and replaces it with parsed data.
export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const details = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
    return next(new ApiError(400, 'Validation failed', details));
  }
  req.body = result.data;
  next();
};
