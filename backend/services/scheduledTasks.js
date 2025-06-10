const cron = require('node-cron');
const Election = require('../models/Election');

/**
 * Updates the status of elections based on their start and end dates,
 * but ONLY if they don't have the "manualStatus" flag set.
 * 
 * This function is disabled by default to prevent automatic status changes.
 * Set ENABLE_AUTO_STATUS_UPDATES=true in environment variables to enable.
 */
const updateElectionStatuses = async () => {
  try {
    // Check if automated updates are enabled (default: disabled)
    if (process.env.ENABLE_AUTO_STATUS_UPDATES !== 'true') {
      console.log(`[${new Date().toISOString()}] Automatic election status updates are disabled`);
      return {
        activated: 0,
        completed: 0,
        skipped: 'Auto-updates disabled by configuration'
      };
    }

    const now = new Date();
    console.log(`[${now.toISOString()}] Running scheduled election status update`);
    
    // Find elections that need to be marked active (started but not ended)
    // Only activate elections where status is explicitly 'pending'
    // AND don't have manualStatus flag set to true
    const activateResult = await Election.updateMany(
      { 
        startDate: { $lte: now }, 
        endDate: { $gt: now }, 
        status: 'pending',
        manualStatus: { $ne: true } // Skip elections with manual status flag
      },
      { 
        $set: { status: 'active' } 
      }
    );
    
    // Find elections that need to be marked completed (ended)
    // Only complete elections where status is 'active'
    // AND don't have manualStatus flag set to true
    const completeResult = await Election.updateMany(
      { 
        endDate: { $lte: now }, 
        status: 'active',
        manualStatus: { $ne: true } // Skip elections with manual status flag
      },
      { 
        $set: { status: 'completed' } 
      }
    );
    
    console.log(`[${now.toISOString()}] Status update complete:
      - Activated: ${activateResult.modifiedCount} elections
      - Completed: ${completeResult.modifiedCount} elections`);
      
    return {
      activated: activateResult.modifiedCount,
      completed: completeResult.modifiedCount
    };
  } catch (error) {
    console.error('Error updating election statuses:', error);
    throw error;
  }
};

/**
 * Initialize all scheduled tasks
 */
const initScheduledTasks = () => {
  // Check if automated updates are enabled
  if (process.env.ENABLE_AUTO_STATUS_UPDATES === 'true') {
    // Run status update every 10 minutes
    // Cron format: minute hour day-of-month month day-of-week
    cron.schedule('*/10 * * * *', updateElectionStatuses);
    
    // Run immediately on startup
    updateElectionStatuses();
    
    console.log('Scheduled election status updates initialized and ENABLED');
  } else {
    console.log('Scheduled election status updates are DISABLED (set ENABLE_AUTO_STATUS_UPDATES=true to enable)');
  }
};

module.exports = {
  initScheduledTasks,
  updateElectionStatuses
}; 