import { mongoClient } from '../config/database.js';
import { DeliveryScheduleType, ScheduleStatus, ScheduledDelivery } from './scheduling.types.js';
import { ObjectId } from 'mongodb';

export class ScheduledDeliveryModel {
  private collection = mongoClient?.db('traka').collection('scheduled_deliveries');

  async create(data: Omit<ScheduledDelivery, 'id' | 'createdAt'>): Promise<ScheduledDelivery> {
    if (!this.collection) {
      throw new Error('MongoDB not available');
    }
    
    const doc = {
      ...data,
      createdAt: new Date()
    };
    
    const result = await this.collection.insertOne(doc);
    return { ...doc, id: result.insertedId.toString() };
  }

  async findPendingDeliveries(): Promise<ScheduledDelivery[]> {
    if (!this.collection) return [];
    
    const now = new Date();
    const docs = await this.collection.find({
      status: ScheduleStatus.PENDING,
      scheduledFor: { $lte: now }
    }).toArray();
    
    return docs.map(doc => ({
      id: doc._id.toString(),
      packageId: doc.packageId,
      scheduleType: doc.scheduleType,
      scheduledFor: doc.scheduledFor,
      status: doc.status,
      createdAt: doc.createdAt,
      dispatchedAt: doc.dispatchedAt
    }));
  }

  async findByPackageId(packageId: string): Promise<ScheduledDelivery | null> {
    if (!this.collection) return null;
    
    const doc = await this.collection.findOne({ packageId });
    if (!doc) return null;
    
    return {
      id: doc._id.toString(),
      packageId: doc.packageId,
      scheduleType: doc.scheduleType,
      scheduledFor: doc.scheduledFor,
      status: doc.status,
      createdAt: doc.createdAt,
      dispatchedAt: doc.dispatchedAt
    };
  }

  async updateStatus(id: string, status: ScheduleStatus, dispatchedAt?: Date): Promise<void> {
    if (!this.collection) return;
    
    const update: any = { status };
    if (dispatchedAt) update.dispatchedAt = dispatchedAt;
    
    await this.collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: update }
    );
  }
}