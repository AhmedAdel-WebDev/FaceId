const User = require('../models/User');
const ErrorResponse = require('../utils/errorResponse');
const { updateElectionStatuses } = require('../services/scheduledTasks');

// @desc    Get all users or users pending approval
// @route   GET /api/v1/admin/users
// @route   GET /api/v1/admin/users?pending=true
// @access  Private (Admin)
exports.getUsers = async (req, res, next) => {
    try {
        let query;
        if (req.query.pending === 'true') {
            query = User.find({ isApproved: false });
        } else {
            query = User.find();
        }

        const users = await query;

        // Remove password from user objects before sending
        const usersWithoutPassword = users.map(user => {
            const userObj = user.toObject ? user.toObject() : { ...user };
            delete userObj.password;
            return userObj;
        });

        res.status(200).json({
            success: true,
            count: usersWithoutPassword.length,
            data: usersWithoutPassword
        });
    } catch (error) {
        next(new ErrorResponse('Server Error fetching users', 500));
    }
};

// @desc    Approve a user account
// @route   PUT /api/v1/admin/users/:id/approve
// @access  Private (Admin)
exports.approveUser = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return next(new ErrorResponse(`User not found with id of ${req.params.id}`, 404));
        }

        // Check if already approved
        if (user.isApproved) {
            return next(new ErrorResponse(`User ${user.username} is already approved`, 400));
        }

        user.isApproved = true;
        // Optionally, set isVerified to true as well if admin approval implies verification
        // user.isVerified = true; 
        await user.save({ validateBeforeSave: false }); // Bypassing validation as we are only changing approval status

        // Remove password from user object before sending
        const userObj = user.toObject ? user.toObject() : { ...user };
        delete userObj.password;

        res.status(200).json({
            success: true,
            data: userObj,
            message: `User ${user.username} approved successfully`
        });
    } catch (error) {
        console.error('Error approving user:', error);
        next(new ErrorResponse('Server Error approving user', 500));
    }
};

// @desc    Reject (or delete) a user account
// @route   DELETE /api/v1/admin/users/:id/reject
// @access  Private (Admin)
exports.rejectUser = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return next(new ErrorResponse(`User not found with id of ${req.params.id}`, 404));
        }

        // Prevent rejecting an already approved admin or an essential account if needed
        if (user.isApproved && user.role === 'admin') {
             return next(new ErrorResponse('Cannot reject an approved admin account.', 400));
        }

        // Instead of just setting a flag, we'll delete the user for a 'reject' action
        // If you want to keep the user but mark as rejected, add an `isRejected` field to the User model
        await User.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            message: `User ${user.username} (ID: ${req.params.id}) rejected and deleted successfully`
        });
    } catch (error) {
        console.error('Error rejecting user:', error);
        next(new ErrorResponse('Server Error rejecting user', 500));
    }
};

// @desc    Get a single user by ID (for admin)
// @route   GET /api/v1/admin/users/:id
// @access  Private (Admin)
exports.getUserById = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return next(new ErrorResponse(`User not found with id of ${req.params.id}`, 404));
        }

        // Remove password from user object before sending
        const userObj = user.toObject ? user.toObject() : { ...user };
        delete userObj.password;

        res.status(200).json({
            success: true,
            data: userObj
        });
    } catch (error) {
        next(new ErrorResponse('Server Error fetching user', 500));
    }
};

// @desc    Manually update all election statuses
// @route   POST /api/v1/admin/update-election-statuses
// @access  Private (Admin)
exports.updateElectionStatuses = async (req, res, next) => {
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