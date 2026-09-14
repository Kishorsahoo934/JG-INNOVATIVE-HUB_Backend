export default (err, req, res, next) => {
  // If headers already sent, delegate to Express default handler to avoid crash
  if (res.headersSent) {
    return next(err);
  }

  console.error(`[Error] ${req.method} ${req.originalUrl}:`, err.message || err);

  const statusCode = err.status || err.statusCode || 500;
  const errMessage = err.message || "Internal Server Error";

  res.status(statusCode).json({
    success: false,
    message: errMessage,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};
