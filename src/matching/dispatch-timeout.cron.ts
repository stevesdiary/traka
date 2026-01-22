import cron from 'node-cron';
import { PackageModel } from '../package/package.model.js';
import { DispatchTimeoutService } from '../matching/services/DispatchTimeoutService.js';
import { Op } from 'sequelize';

const timeoutService = new DispatchTimeoutService();

// Run every minute to check for packages that have been pending for 10+ minutes
// export const startDispatchTimeoutCron = () => {
//   cron.schedule('* * * * *', async () => {
//     try {
//       const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      
//       // Find packages that are still PENDING and created more than 10 minutes ago
//       const timedOutPackages = await PackageModel.findAll({
//         where: {
//           status: 'PENDING',
//           createdAt: {
//             [Op.lte]: tenMinutesAgo
//           }
//         },
//         limit: 50 // Process in batches
//       });

//       if (timedOutPackages.length > 0) {
//         console.log(`Found ${timedOutPackages.length} timed-out packages`);
        
//         for (const pkg of timedOutPackages) {
//           await timeoutService.checkAndHandleTimeout(pkg.id);
//         }
//       }
//     } catch (error) {
//       console.error('Error in dispatch timeout cron:', error);
//     }
//   });

//   console.log('✅ Dispatch timeout cron job started (runs every minute)');
// };
