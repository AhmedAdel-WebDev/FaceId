const express = require('express');
const dotenv = require('dotenv');
const path = require('path'); // Import path
const cors = require('cors'); // Make sure cors is imported and used
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');
const { initScheduledTasks } = require('./services/scheduledTasks'); // Import scheduled tasks

// Remove any lines like:
// const { loadModels } = require('./services/faceRecognitionService');
// loadModels();

// Load environment variables
dotenv.config();

// Connect Database
connectDB();



// Route files
const elections = require('./routes/elections');
const auth = require('./routes/auth');
const admin = require('./routes/admin'); // Import admin routes
// const users = require('./routes/users'); // Comment out or remove this line
const stats = require('./routes/stats'); // If you have stats routes
const { topLevelVoteRouter } = require('./routes/votes'); // Import top-level vote router


const app = express();

// Body parser - Increase limit for large payloads like base64 images
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true })); // Also increase urlencoded limit if needed

// Enable CORS - Configure as needed for security
app.use(cors()); // Basic setup, restrict origin in production

// Dev logging middleware (optional)
if (process.env.NODE_ENV === 'development') {
    // app.use(morgan('dev')); // If using morgan
}

// --- EDIT: Serve static files from the 'uploads' directory ---
// This makes files in backend/uploads accessible via URL, e.g., /uploads/cvs/yourfile.pdf
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// --- END EDIT ---


// Mount routers
app.use('/api/v1/elections', elections);
app.use('/api/v1/auth', auth);
app.use('/api/v1/admin', admin); // Mount admin routes
// app.use('/api/v1/users', users); // Comment out or remove this line
app.use('/api/v1/stats', stats); // If using
app.use('/api/v1/votes', topLevelVoteRouter); // Mount vote routes


// Error Handler Middleware (should be last)
// Import the error handler
const errorHandler = require('./middleware/errorHandler');

// Error Handler Middleware (MUST be last, after routes)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const server = app.listen(
    PORT,
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`) // Use colors if installed
);

// Initialize scheduled tasks after server is running
initScheduledTasks();

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
    console.error(`Error: ${err.message}`); // Use colors if installed
    // Close server & exit process
    server.close(() => process.exit(1));
});