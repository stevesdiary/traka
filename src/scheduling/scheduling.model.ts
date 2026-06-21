import { Table, Column, Model, DataType, PrimaryKey, Default } from 'sequelize-typescript';
import { Op } from 'sequelize';
import { DeliveryScheduleType, ScheduleStatus, ScheduledDelivery } from './scheduling.types.js';

@Table({
  tableName: 'scheduled_deliveries',
  timestamps: true,
  underscored: true
})
export class ScheduledDeliveryRecord extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @Column({
    type: DataType.UUID,
    allowNull: false,
    field: 'package_id'
  })
  declare packageId: string;

  @Column({
    type: DataType.ENUM(...Object.values(DeliveryScheduleType)),
    allowNull: false,
    field: 'schedule_type'
  })
  declare scheduleType: DeliveryScheduleType;

  @Column({
    type: DataType.DATE,
    allowNull: false,
    field: 'scheduled_for'
  })
  declare scheduledFor: Date;

  @Column({
    type: DataType.ENUM(...Object.values(ScheduleStatus)),
    allowNull: false,
    defaultValue: ScheduleStatus.PENDING
  })
  declare status: ScheduleStatus;

  @Column({
    type: DataType.DATE,
    allowNull: true,
    field: 'dispatched_at'
  })
  declare dispatchedAt: Date | undefined;
}

function toScheduledDelivery(record: ScheduledDeliveryRecord): ScheduledDelivery {
  return {
    id: record.id,
    packageId: record.packageId,
    scheduleType: record.scheduleType,
    scheduledFor: record.scheduledFor,
    status: record.status,
    createdAt: record.createdAt as Date,
    dispatchedAt: record.dispatchedAt
  };
}

// Wrapper class — keeps the same interface the service uses, now backed by Postgres.
export class ScheduledDeliveryModel {
  async create(data: Omit<ScheduledDelivery, 'id' | 'createdAt'>): Promise<ScheduledDelivery> {
    const record = await ScheduledDeliveryRecord.create({
      packageId: data.packageId,
      scheduleType: data.scheduleType,
      scheduledFor: data.scheduledFor,
      status: data.status,
      dispatchedAt: data.dispatchedAt
    });
    return toScheduledDelivery(record);
  }

  async findPendingDeliveries(): Promise<ScheduledDelivery[]> {
    const records = await ScheduledDeliveryRecord.findAll({
      where: {
        status: ScheduleStatus.PENDING,
        scheduledFor: { [Op.lte]: new Date() }
      },
      order: [['scheduled_for', 'ASC']]
    });
    return records.map(toScheduledDelivery);
  }

  async findByPackageId(packageId: string): Promise<ScheduledDelivery | null> {
    const record = await ScheduledDeliveryRecord.findOne({
      where: { packageId: String(packageId) }
    });
    return record ? toScheduledDelivery(record) : null;
  }

  async updateStatus(id: string, status: ScheduleStatus, dispatchedAt?: Date): Promise<void> {
    await ScheduledDeliveryRecord.update(
      { status, ...(dispatchedAt && { dispatchedAt }) },
      { where: { id } }
    );
  }
}
