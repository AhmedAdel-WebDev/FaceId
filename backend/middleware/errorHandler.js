const ErrorResponse = require('../utils/errorResponse');

const errorHandler = (err, req, res, next) => {
    let error = { ...err };

    error.message = err.message;

    // Log to console for dev
    console.error('Error Handler:', err.stack || err); // Log the stack or the error itself

    // Mongoose bad ObjectId
    if (err.name === 'CastError') {
        const message = `Resource not found`; // More generic message
        error = new ErrorResponse(message, 404);
    }

    // Mongoose duplicate key
    if (err.code === 11000) {
        let field = 'Field';
        try {
            // Attempt to extract the field name
            field = Object.keys(err.keyValue)[0];
            field = field.charAt(0).toUpperCase() + field.slice(1); // Capitalize
        } catch (e) {
            console.error('Could not extract field from duplicate key error:', e);
        }
        const message = `${field} already exists`;
        error = new ErrorResponse(message, 400);
    }

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        const messages = Object.values(err.errors).map(val => val.message);
        const message = `Validation Failed: ${messages.join(', ')}`;
        error = new ErrorResponse(message, 400);
    }

    // Check if it's an API request (path starts with /api/)
    if (req.originalUrl.startsWith('/api/')) {
        res.status(error.statusCode || 500).json({
            success: false,
            error: error.message || 'Server Error'
        });
    } else {
        // For non-API requests, fall back to default Express handler (or render an HTML error page)
        // You might want to customize this further based on your app's needs
        res.status(error.statusCode || 500);
        // If you have an error view template:
        // res.render('error', { error });
        // Otherwise, send plain text or default HTML:
        res.send(error.message || 'Server Error');
    }
};

module.exports = errorHandler;