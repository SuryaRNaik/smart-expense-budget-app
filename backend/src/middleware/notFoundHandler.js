/**
 * 404 Route Not Found handler returning standardized error envelope per SAD Section 4.4
 * Shape: { error: { code, message } }
 */
const notFoundHandler = (req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Route not found: ${req.originalUrl}`,
    },
  });
};

module.exports = notFoundHandler;
