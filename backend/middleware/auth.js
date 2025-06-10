const jwt = require('jsonwebtoken');
const User = require('../models/User');
// Consider adding a custom ErrorResponse utility later

// Protect routes - Verify token and attach user to req
exports.protect = async (req, res, next) => {
    let token;

    // Check headers first, then cookies
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        // Set token from Bearer token in header
        token = req.headers.authorization.split(' ')[1];
    }
    // If not in header, check cookies (useful for browser-based requests)
    else if (req.cookies && req.cookies.token) {
         token = req.cookies.token;
    }


    // Make sure token exists
    if (!token) {
        return res.status(401).json({ success: false, message: 'Not authorized to access this route (no token)' });
        // return next(new ErrorResponse('Not authorized to access this route', 401));
    }

    try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Find user by ID from token payload and attach to request object
        // Exclude password even if it wasn't explicitly selected against in the model default
        req.user = await User.findById(decoded.id).select('-password');

        if (!req.user) {
             // Handle case where user associated with token no longer exists
             return res.status(401).json({ success: false, message: 'Not authorized, user not found' });
        }

        next(); // Proceed to the next middleware or route handler
    } catch (err) {
        console.error(err);
        return res.status(401).json({ success: false, message: 'Not authorized to access this route (token invalid)' });
        // return next(new ErrorResponse('Not authorized to access this route', 401));
    }
};

// Grant access to specific roles
exports.authorize = (...roles) => {
    return (req, res, next) => {
        // This middleware runs *after* 'protect', so req.user should exist
        if (!req.user || !roles.includes(req.user.role)) {
             return res.status(403).json({ success: false, message: `User role '${req.user ? req.user.role : 'none'}' is not authorized to access this route` });
            // return next(
            //     new ErrorResponse(
            //         `User role ${req.user.role} is not authorized to access this route`,
            //         403 // Forbidden
            //     )
            // );
        }
        next(); // Role is authorized
    };
};
