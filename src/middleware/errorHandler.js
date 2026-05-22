function errorHandler(err, req, res, _next) {
  console.error('Unhandled error:', {
    requestId: req.requestId,
    message: err.message,
    stack: err.stack,
  });

  const statusCode = err.statusCode || 500;

  res.status(statusCode).json({
    success: false,
    message: err.publicMessage || 'Something went wrong on the server.',
    requestId: req.requestId,
  });
}

module.exports = errorHandler;
