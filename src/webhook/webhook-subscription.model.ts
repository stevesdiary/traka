import { Table, Column, Model, DataType, PrimaryKey, Default, ForeignKey } from 'sequelize-typescript';
import { TenantModel } from '../tenant/tenant.model.js';

@Table({
  tableName: 'webhook_subscriptions',
  timestamps: true,
  underscored: true,
})
export class WebhookSubscriptionModel extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => TenantModel)
  @Column({ type: DataType.UUID, allowNull: false })
  declare tenant_id: string;

  @Column({ type: DataType.STRING(2048), allowNull: false })
  declare url: string;

  @Column({ type: DataType.STRING, allowNull: false })
  declare secret: string;

  @Column({ type: DataType.JSONB, defaultValue: [] })
  declare events: string[];

  @Column({
    type: DataType.ENUM('ACTIVE', 'DISABLED'),
    defaultValue: 'ACTIVE',
    allowNull: false,
  })
  declare status: 'ACTIVE' | 'DISABLED';

  @Column({ type: DataType.DATE, allowNull: true })
  declare last_delivery_at: Date | null;

  @Column({ type: DataType.INTEGER, defaultValue: 0 })
  declare failure_count: number;
}

export const WEBHOOK_EVENTS = [
  'order.created',
  'order.status_changed',
  'order.delivered',
  'order.confirmed',
  'rider.assigned',
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];
