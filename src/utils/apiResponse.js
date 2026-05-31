// Consistent success envelope: { success, message, data, meta }
export const sendSuccess = (res, { status = 200, message = 'OK', data = null, meta } = {}) => {
  const body = { success: true, message, data };
  if (meta) body.meta = meta;
  return res.status(status).json(body);
};
