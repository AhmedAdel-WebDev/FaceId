const express = require('express');
const router = express.Router();
const {
    getUsers,
    approveUser,
    rejectUser,
    getUserById,
    updateElectionStatuses
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth'); // Assuming you have this middleware

// All routes in this file will be protected and restricted to 'admin'
router.use(protect);
router.use(authorize('admin'));

router.route('/users')
    .get(getUsers); // GET /api/v1/admin/users?pending=true to get pending users

router.route('/users/:id')
    .get(getUserById);

router.route('/users/:id/approve')
    .put(approveUser);

router.route('/users/:id/reject')
    .delete(rejectUser);

// Election status management route
router.route('/update-election-statuses')
    .post(updateElectionStatuses);

module.exports = router;