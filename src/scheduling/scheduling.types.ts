export enum DeliveryScheduleType {
  IMMEDIATE = 'IMMEDIATE',
  SCHEDULED = 'SCHEDULED',
  SAME_DAY = 'SAME_DAY',
  NEXT_DAY = 'NEXT_DAY'
}

export enum ScheduleStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  DISPATCHED = 'DISPATCHED',
  CANCELLED = 'CANCELLED'
}

export interface ScheduledDelivery {
  id: string;
  packageId: string;
  scheduleType: DeliveryScheduleType;
  scheduledFor: Date;
  status: ScheduleStatus;
  createdAt: Date;
  dispatchedAt?: Date;
}

export interface ScheduleRequest {
  packageId: string;
  scheduleType: DeliveryScheduleType;
  scheduledFor?: string; // ISO string for SCHEDULED type
}