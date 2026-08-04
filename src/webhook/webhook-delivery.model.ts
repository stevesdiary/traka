import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  ForeignKey,
} from "sequelize-typescript";
import { WebhookSubscriptionModel } from "./webhook-subscription.model.js";

@Table({
  tableName: "webhook_deliveries",
  timestamps: true,
  underscored: true,
})
export class WebhookDeliveryModel extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => WebhookSubscriptionModel)
  @Column({ type: DataType.UUID, allowNull: false })
  declare subscription_id: string;

  @Column({ type: DataType.UUID, allowNull: false })
  declare tenant_id: string;

  @Column({ type: DataType.STRING, allowNull: false })
  declare event: string;

  @Column({ type: DataType.JSONB, allowNull: false })
  declare payload: object;

  @Column({ type: DataType.STRING, allowNull: false })
  declare delivery_id: string;

  @Column({ type: DataType.TEXT, allowNull: false })
  declare body: string;

  @Column({
    type: DataType.ENUM("PENDING", "SUCCEEDED", "FAILED", "DEAD"),
    defaultValue: "PENDING",
    allowNull: false,
  })
  declare status: "PENDING" | "SUCCEEDED" | "FAILED" | "DEAD";

  @Column({ type: DataType.INTEGER, defaultValue: 0 })
  declare attempt_count: number;

  @Column({ type: DataType.INTEGER, defaultValue: 6 })
  declare max_attempts: number;

  @Column({ type: DataType.DATE, allowNull: true })
  declare last_attempt_at: Date | null;

  @Column({ type: DataType.INTEGER, allowNull: true })
  declare last_status_code: number | null;

  @Column({ type: DataType.STRING, allowNull: true })
  declare last_error: string | null;

  @Column({ type: DataType.STRING, allowNull: true })
  declare qstash_message_id: string | null;
}
