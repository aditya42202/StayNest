export const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

export const errorHandler = (err, req, res, next) => {
  const errorStatus = err.statusCode || err.status;
  const statusCode = res.statusCode === 200
    ? Number.isInteger(errorStatus) && errorStatus >= 400 && errorStatus <= 599
      ? errorStatus
      : 500
    : res.statusCode;
  if (statusCode >= 500) {
    console.error(JSON.stringify({
      event: 'request_failed',
      statusCode,
      method: req.method,
      errorName: typeof err.name === 'string' ? err.name : 'UnknownError',
      errorCode: typeof err.code === 'string' ? err.code : undefined
    }));
  }
  res.status(statusCode).json({
    message: process.env.NODE_ENV === 'production' && statusCode === 500
      ? 'Internal server error'
      : err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack
  });
};
