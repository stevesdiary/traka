import cron from 'node-cron';
import { redis } from '../config/database.js';
import { PackageRepository } from '../package/package.repository.js';
import { RiderRepository } from '../rider/rider.repository.js';
import { DispatchService } from './services/DispatchService.js';
import { CourierPresenceService } from './services/CourierPresenceService.js';
import { VehicleType } from './config/vehicles.js';
import type { DeliveryRequest } from './models/CourierState.js';
import logger from '../utils/logger.js';

const BACKGROUND_KEY_PATTERN = 'dispatch:background:*';
const MAX_BATCH = 20;

const packageRepo = new PackageRepository();
const riderRepo = new RiderRepository();

async function processOne(packageId: string): Promise<void> {
  const pkg = await packageRepo.findById(packageId);

  if (!pkg) {
    await redis.del(`dispatch:background:${packageId}`);
    return;
  }

  // Already assigned or no longer pending — clean up
  if (pkg.rider_id || pkg.status !== 'PENDING') {
    await redis.del(`dispatch:background:${packageId}`);
    return;
  }

  const request: DeliveryRequest = {
    id: pkg.id,
    pickupLocation: {
      lat: (pkg as any).pickup_latitude ?? 6.5244,
      lng: (pkg as any).pickup_longitude ?? 3.3792,
      address: (pkg as any).pickup_address ?? '',
    },
    dropoffLocation: {
      lat: (pkg as any).delivery_latitude ?? 6.5244,
      lng: (pkg as any).delivery_longitude ?? 3.3792,
      address: pkg.delivery_address ?? '',
    },
    package: {
      weight: pkg.package_weight ? Number(pkg.package_weight) : 1,
      volume: 1,
      fragile: Boolean((pkg as any).is_fragile),
    },
    requiredVehicleType: pkg.package_weight && Number(pkg.package_weight) > 10
      ? VehicleType.MOTORCYCLE
      : undefined,
    createdAt: new Date(pkg.createdAt).getTime(),
  };

  const result = await DispatchService.dispatchDelivery(request);

  if (!result.success || !result.assignedCourier) {
    logger.info('Background dispatch: no rider found yet', { packageId, attempts: result.attempts });
    return; // Leave key in Redis to retry next cycle
  }

  // Resolve rider user_id from courier id
  const riderByPk = await riderRepo.findById(result.assignedCourier.id);
  const rider = riderByPk
    ? (await riderRepo.getRiderByUserId(riderByPk.user_id)) ?? riderByPk
    : await riderRepo.getRiderByUserId(result.assignedCourier.id);

  if (!rider) {
    logger.warn('Background dispatch: courier accepted but rider profile not found', { courierId: result.assignedCourier.id });
    return;
  }

  const etaSeconds = result.eta ? Math.round(result.eta) : undefined;
  await packageRepo.assignRider(pkg.id, rider.user_id, etaSeconds);

  await Promise.allSettled([
    riderRepo.updateRiderProfile(rider.user_id, { status: 'BUSY', is_available: false }),
    CourierPresenceService.updateCourierStatus(result.assignedCourier.id, 'BUSY', rider.vehicle_type as VehicleType),
  ]);

  await redis.del(`dispatch:background:${packageId}`);

  logger.info('Background dispatch: rider assigned', {
    packageId,
    riderId: rider.user_id,
    attempts: result.attempts,
  });
}

export const startBackgroundDispatchCron = (): void => {
  cron.schedule('* * * * *', async () => {
    try {
      const keys = await redis.keys(BACKGROUND_KEY_PATTERN);
      if (keys.length === 0) return;

      const batch = keys.slice(0, MAX_BATCH);
      logger.debug('Background dispatch cron: processing batch', { count: batch.length });

      await Promise.allSettled(
        batch.map(key => {
          const packageId = key.replace('dispatch:background:', '');
          return processOne(packageId).catch(err =>
            logger.error('Background dispatch: error processing package', { packageId, error: err.message })
          );
        })
      );
    } catch (err: any) {
      logger.error('Background dispatch cron error', { error: err.message });
    }
  });

  logger.info('Background dispatch cron started (runs every minute)');
};
