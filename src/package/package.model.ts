import { Table, Column, Model, DataType, PrimaryKey, Default, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { UserModel } from '../user/user.model.js';

@Table({
  tableName: 'packages',
  timestamps: true
})
export class PackageModel extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true
  })
  tracking_number!: string;

  @ForeignKey(() => UserModel)
  @Column(DataType.UUID)
  sender_id!: string;

  // Guest delivery support - recipient_id is optional
  @ForeignKey(() => UserModel)
  @Column({
    type: DataType.UUID,
    allowNull: true
  })
  recipient_id?: string;

  // Guest recipient information
  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  recipient_name!: string;

  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  recipient_email?: string;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  recipient_phone!: string;

  @Column({
    type: DataType.ENUM('PENDING', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'),
    defaultValue: 'PENDING'
  })
  status!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  delivery_address!: string;

  @Column(DataType.TEXT)
  description!: string;

  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  tenant_id!: string;

  // Delivery tracking
  @Column(DataType.DATE)
  delivered_at?: Date;

  @Column(DataType.STRING)
  delivery_notes?: string;

  // Pricing fields
  @Column({
    type: DataType.ENUM('SMALL', 'MEDIUM', 'LARGE'),
    defaultValue: 'SMALL'
  })
  package_size!: string;

  @Column({
    type: DataType.DECIMAL(5, 2),
    allowNull: true
  })
  package_weight?: number;

  @Column({
    type: DataType.ENUM('STANDARD', 'EXPRESS', 'SAME_DAY'),
    defaultValue: 'STANDARD'
  })
  delivery_speed!: string;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: true
  })
  delivery_fee?: number;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: true
  })
  platform_fee?: number;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: true
  })
  total_amount?: number;

  @Column({
    type: DataType.DECIMAL(8, 2),
    allowNull: true
  })
  estimated_distance_km?: number;

  // Verification fields
  @Column({
    type: DataType.STRING(6),
    allowNull: true
  })
  pickup_pin?: string;

  @Column({
    type: DataType.STRING(6),
    allowNull: true
  })
  delivery_pin?: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  qr_code_data?: string;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false
  })
  pickup_confirmed!: boolean;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false
  })
  delivery_confirmed!: boolean;

  @Column(DataType.DATE)
  pickup_confirmed_at?: Date;

  @Column(DataType.DATE)
  delivery_confirmed_at?: Date;

  // Guest tracking token for non-registered recipients
  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  guest_tracking_token?: string;

  @BelongsTo(() => UserModel, 'sender_id')
  sender!: UserModel;

  @BelongsTo(() => UserModel, 'recipient_id')
  recipient?: UserModel;
}