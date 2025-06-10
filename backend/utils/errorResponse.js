class ErrorResponse extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;

        // Optional: Capture stack trace (useful for debugging)
        Error.captureStackTrace(this, this.constructor);
    }
}

module.exports = ErrorResponse;