import { RiderModel } from './rider.model.js';
import { Op } from 'sequelize';

// export class RiderCleanupCron {
//   private static readonly RETENTION_DAYS = 360;

//   static async cleanupOldDeletedRiders(): Promise<void> {
//     try {
//       const cutoffDate = new Date();
//       cutoffDate.setDate(cutoffDate.getDate() - this.RETENTION_DAYS);

//       const deletedRiders = await RiderModel.findAll({
//         where: {
//           deletedAt: {
//             [Op.lte]: cutoffDate,
//             [Op.ne]: null
//           }
//         },
//         paranoid: false
//       });

//       console.log(`Found ${deletedRiders.length} riders to permanently delete (deleted > ${this.RETENTION_DAYS} days ago)`);

//       for (const rider of deletedRiders) {
//         await RiderModel.destroy({
//           where: { id: rider.id },
//           force: true
//         });
//         console.log(`Permanently deleted rider ${rider.rider_id} (${rider.id})`);
//       }

//       console.log(`Cleanup completed: ${deletedRiders.length} riders permanently deleted`);
//     } catch (error) {
//       console.error('Error during rider cleanup:', error);
//     }
//   }

//   static startCronJob(): void {
//     // Run every 3 days at 2 AM
//     const THREE_DAYS_INTERVAL = 3 * 24 * 60 * 60 * 1000; // 3 days
    
//     setInterval(() => {
//       const now = new Date();
//       if (now.getHours() === 2) {
//         this.cleanupOldDeletedRiders();
//       }
//     }, THREE_DAYS_INTERVAL);

//     console.log('Rider cleanup cron job started (runs every 3 days at 2 AM)');
//   }
// }
