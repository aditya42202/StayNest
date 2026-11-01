export const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

export const errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  if (statusCode >= 500) {
    console.error(err);
  }
  res.status(statusCode).json({
    message: process.env.NODE_ENV === 'production' && statusCode === 500
      ? 'Internal server error'
      : err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack
  });
};
