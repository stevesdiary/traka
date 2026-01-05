import { ScheduledDeliveryModel } from './scheduling.model.js';
import { DeliveryScheduleType, ScheduleStatus, ScheduleRequest } from './scheduling.types.js';

export class SchedulingService {
  private scheduledDeliveryModel = new ScheduledDeliveryModel();

  async scheduleDelivery(request: ScheduleRequest): Promise<void> {
    const scheduledFor = this.calculateScheduledTime(request);
    
    await this.scheduledDeliveryModel.create({
      packageId: request.packageId,
      scheduleType: request.scheduleType,
      scheduledFor,
      status: ScheduleStatus.PENDING
    });
  }

  async processPendingDeliveries(): Promise<void> {
    const pendingDeliveries = await this.scheduledDeliveryModel.findPendingDeliveries();
    
    for (const delivery of pendingDeliveries) {
      try {
        // Mark as dispatched - actual dispatch logic would go here
        await this.scheduledDeliveryModel.updateStatus(
          delivery.id, 
          ScheduleStatus.DISPATCHED, 
          new Date()
        );
      } catch (error) {
        console.error(`Failed to dispatch delivery ${delivery.id}:`, error);
      }
    }
  }

  private calculateScheduledTime(request: ScheduleRequest): Date {
    const now = new Date();
    
    switch (request.scheduleType) {
      case DeliveryScheduleType.IMMEDIATE:
        return now;
        
      case DeliveryScheduleType.SCHEDULED:
        if (!request.scheduledFor) {
          throw new Error('scheduledFor required for SCHEDULED type');
        }
        return new Date(request.scheduledFor);
        
      case DeliveryScheduleType.SAME_DAY:
        const sameDay = new Date(now);
        sameDay.setHours(23, 59, 59, 999); // End of day
        return sameDay;
        
      case DeliveryScheduleType.NEXT_DAY:
        const nextDay = new Date(now);
        nextDay.setDate(nextDay.getDate() + 1);
        nextDay.setHours(9, 0, 0, 0); // 9 AM next day
        return nextDay;
        
      default:
        throw new Error('Invalid schedule type');
    }
  }
}