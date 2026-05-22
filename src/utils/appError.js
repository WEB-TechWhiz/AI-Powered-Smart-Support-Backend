class AppError extends Error {
  constructor(message, statusCode = 500, publicMessage = message) {
    super(message);
    this.statusCode = statusCode;
    this.publicMessage = publicMessage;
  }
}

module.exports = AppError;
