/**
 * Centralized error handler returning standardized error envelope per SAD Section 4.4
 * Shape: { error: { code, message } }
 */
const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal server error';
  const code = err.code || (statusCode === 500 ? 'INTERNAL_ERROR' : 'ERROR');

  res.status(statusCode).json({
    error: {
      code,
      message,
    },
  });
};

module.exports = errorHandler;
