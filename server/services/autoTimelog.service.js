// server/services/autoTimelog.service.js
const TimeLog = require('../models/timelog.model');
const Movement = require('../models/movement.model');
const Preparation = require('../models/preparation.model');
const User = require('../models/user.model');

/**
 * Service to automatically manage timelogs
 * Handles auto-ending of user service periods
 */
class AutoTimelogService {
  /**
   * End service for users who should no longer be active
   * Runs at 4:00 AM Paris time to clean up active timelogs
   */
  async endOrphanedServices() {
    try {
      console.log('🕓 Running automatic timelog cleanup service');
      
      // Get all users with active timelogs
      const activeLogs = await TimeLog.find({ status: 'active' })
        .populate('userId', 'username fullName role');
      
      if (activeLogs.length === 0) {
        console.log('✅ No active timelogs found, nothing to clean up');
        return;
      }
      
      console.log(`🔍 Found ${activeLogs.length} active timelogs to check`);
      
      for (const log of activeLogs) {
        const user = log.userId;
        
        // Skip if user doesn't exist
        if (!user) {
          console.log(`⚠️ Found an active timelog without a valid user reference, ID: ${log._id}`);
          continue;
        }
        
        // Check based on user role
        if (['driver', 'team-leader'].includes(user.role)) {
          await this.processDriverTimelog(log, user);
        } else if (user.role === 'preparator') {
          await this.processPreparatorTimelog(log, user);
        }
      }
      
      console.log('✅ Automatic timelog cleanup completed');
    } catch (error) {
      console.error('❌ Error in endOrphanedServices:', error);
    }
  }
  
  /**
   * Process driver/team-leader timelogs
   * End service 15 minutes after last completed movement
   */
  async processDriverTimelog(log, user) {
    try {
      // Find the most recent completed movement for this user
      const lastMovement = await Movement.findOne({ 
        userId: user._id,
        status: 'completed'
      }).sort({ arrivalTime: -1 });
      
      if (!lastMovement) {
        console.log(`ℹ️ No completed movements found for ${user.fullName} (${user.role})`);
        return;
      }
      
      // Check if the last movement was completed more than 15 minutes ago
      const lastMovementTime = lastMovement.arrivalTime || lastMovement.updatedAt;
      const fifteenMinutesAfterLastMovement = new Date(lastMovementTime.getTime() + 15 * 60000);
      const now = new Date();
      
      if (now > fifteenMinutesAfterLastMovement) {
        // End the timelog
        await this.endTimelog(log, lastMovementTime, user);
      } else {
        console.log(`ℹ️ User ${user.fullName} (${user.role}) still within 15-minute window after last movement`);
      }
    } catch (error) {
      console.error(`❌ Error processing driver timelog for ${user.fullName}:`, error);
    }
  }
  
  /**
   * Process preparator timelogs
   * End service 15 minutes after last completed preparation
   */
  async processPreparatorTimelog(log, user) {
    try {
      // Find the most recent completed preparation for this user
      const lastPreparation = await Preparation.findOne({ 
        userId: user._id,
        status: 'completed'
      }).sort({ endTime: -1 });
      
      if (!lastPreparation) {
        console.log(`ℹ️ No completed preparations found for ${user.fullName} (preparator)`);
        return;
      }
      
      // Check if the last preparation was completed more than 15 minutes ago
      const lastPreparationTime = lastPreparation.endTime || lastPreparation.updatedAt;
      const fifteenMinutesAfterLastPreparation = new Date(lastPreparationTime.getTime() + 15 * 60000);
      const now = new Date();
      
      if (now > fifteenMinutesAfterLastPreparation) {
        // End the timelog
        await this.endTimelog(log, lastPreparationTime, user);
      } else {
        console.log(`ℹ️ User ${user.fullName} (preparator) still within 15-minute window after last preparation`);
      }
    } catch (error) {
      console.error(`❌ Error processing preparator timelog for ${user.fullName}:`, error);
    }
  }
  
  /**
   * End the timelog and record information about why it was ended
   */
  async endTimelog(log, lastActivityTime, user) {
    try {
      // Calculate the end time (15 minutes after the last activity)
      const endTime = new Date(lastActivityTime.getTime() + 15 * 60000);
      
      // Update the timelog
      log.endTime = endTime;
      log.status = 'completed';
      
      // Add a note about automated ending
      const note = log.notes || '';
      log.notes = note + (note ? '\n' : '') + 
                 `Service terminé automatiquement 15 minutes après la dernière activité (${endTime.toLocaleString('fr-FR')}).`;
      
      await log.save();
      
      console.log(`✅ Automatically ended service for ${user.fullName} (${user.role})`);
      console.log(`   Service ended at: ${endTime.toLocaleString('fr-FR')}`);
      console.log(`   Last activity at: ${lastActivityTime.toLocaleString('fr-FR')}`);
    } catch (error) {
      console.error(`❌ Error ending timelog for ${user.fullName}:`, error);
    }
  }
}

module.exports = new AutoTimelogService();