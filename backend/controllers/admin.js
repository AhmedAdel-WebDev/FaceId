const User = require('../models/User');
const Election = require('../models/Election');
const { updateElectionStatuses } = require('../services/scheduledTasks');

// @desc    Get all users
// @route   GET /api/v1/admin/users
// @access  Private (Admin)
exports.getUsers = async (req, res, next) => {
    try {
        const users = await User.find().select('-password');
        
        res.status(200).json({
            success: true,
            count: users.length,
            data: users
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
};

// @desc    Manually update all election statuses
// @route   POST /api/v1/admin/update-election-statuses
// @access  Private (Admin)
exports.manualStatusUpdate = async (req, res, next) => {
    try {
        const result = await updateElectionStatuses();
        
        res.status(200).json({
            success: true,
            message: 'Election statuses updated successfully',
            data: result
        });
    } catch (err) {
        console.error('Error in manual status update:', err);
        res.status(500).json({
            success: false,
            message: 'Server Error updating election statuses'
        });
    }
}; 