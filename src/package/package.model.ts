import { Table, Column, Model, DataType, PrimaryKey, Default, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { UserModel } from '../user/user.model.js';

@Table({
  tableName: 'packages',
  timestamps: true,
  underscored: true,
  paranoid: true
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
  declare tracking_number: string;

  @ForeignKey(() => UserModel)
  @Column(DataType.UUID)
  declare sender_id: string;

  // Guest delivery support - recipient_id is optional
  @ForeignKey(() => UserModel)
  @Column({
    type: DataType.UUID,
    allowNull: true
  })
  declare recipient_id: string | undefined;

  // Guest recipient information
  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  declare recipient_name: string;

  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  declare recipient_email: string | undefined;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  declare recipient_phone: string;

  @Column({
    type: DataType.ENUM('PENDING', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'),
    defaultValue: 'PENDING'
  })
  declare status: string;

  // Scheduling fields
  @Column({
    type: DataType.ENUM('IMMEDIATE', 'SCHEDULED', 'SAME_DAY', 'NEXT_DAY'),
    defaultValue: 'IMMEDIATE'
  })
  declare schedule_type: string;

  @Column({
    type: DataType.DATE,
    allowNull: true
  })
  declare scheduled_for: Date | undefined;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  declare pickup_address: string;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  declare delivery_address: string;

  @Column(DataType.TEXT)
  declare description: string;

  @Column({
    type: DataType.UUID,
    allowNull: true
  })
  declare tenant_id: string | undefined;

  // Delivery tracking
  @Column(DataType.DATE)
  declare delivered_at: Date | undefined;

  @Column(DataType.STRING)
  declare delivery_notes: string | undefined;

  // Pricing fields
  @Column({
    type: DataType.ENUM('SMALL', 'MEDIUM', 'LARGE'),
    defaultValue: 'SMALL'
  })
  declare package_size: string;

  @Column({
    type: DataType.DECIMAL(5, 2),
    allowNull: true
  })
  declare package_weight: number | undefined;

  @Column({
    type: DataType.ENUM('STANDARD', 'EXPRESS', 'SAME_DAY'),
    defaultValue: 'STANDARD'
  })
  declare delivery_speed: string;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: true
  })
  declare delivery_fee: number | undefined;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: true
  })
  declare platform_fee: number | undefined;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: true
  })
  declare total_amount: number | undefined;

  @Column({
    type: DataType.DECIMAL(8, 2),
    allowNull: true
  })
  declare estimated_distance_km: number | undefined;

  // Payment fields
  @Column({
    type: DataType.ENUM('DIGITAL', 'CASH', 'BANK_TRANSFER'),
    defaultValue: 'DIGITAL'
  })
  declare payment_method: string;

  @Column({
    type: DataType.ENUM('SENDER', 'RECIPIENT'),
    defaultValue: 'SENDER'
  })
  declare payment_by: string;

  @Column({
    type: DataType.ENUM('PENDING', 'PAID', 'FAILED'),
    defaultValue: 'PENDING'
  })
  declare payment_status: string;

  @Column(DataType.DATE)
  declare paid_at: Date | undefined;

  @Column({
    type: DataType.ENUM(
      'FOOD',
      'SHOES',
      'ELECTRONICS',
      'CLOTHING',
      'JEWELRY_VALUABLES',
      'GROCERIES',
      'DOCUMENTS',
      'HEALTH_PHARMACEUTICALS',
      'CONSTRUCTION_MATERIALS',
      'HOUSEHOLD_ITEMS',
      'OTHERS'
    ),
    allowNull: false,
    defaultValue: 'OTHERS'
  })
  declare category: string;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false
  })
  declare is_fragile: boolean;

  // Verification fields
  @Column({
    type: DataType.STRING(6),
    allowNull: true
  })
  declare pickup_pin: string | undefined;

  @Column({
    type: DataType.STRING(6),
    allowNull: true
  })
  declare delivery_pin: string | undefined;

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  declare qr_code_data: string | undefined;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false
  })
  declare pickup_confirmed: boolean;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false
  })
  declare delivery_confirmed: boolean;

  @Column(DataType.DATE)
  declare pickup_confirmed_at: Date | undefined;

  @Column(DataType.DATE)
  declare delivery_confirmed_at: Date | undefined;

  // Cancellation fields
  @Column({
    type: DataType.ENUM(
      'PILOT_ASKED_TO_CANCEL',
      'LONG_PICKUP_TIME',
      'WRONG_ORDER_DETAILS',
      'RIDER_ASKING_DIFFERENT_MONEY',
      'RIDER_UNTIDY_NO_UNIFORM',
      'FOUND_ALTERNATIVE',
      'PACKAGE_HEAVIER_THAN_CAPACITY',
      'OTHER'
    ),
    allowNull: true
  })
  declare cancellation_reason: string | undefined;

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  declare cancellation_note: string | undefined;

  @Column(DataType.DATE)
  declare cancelled_at: Date | undefined;

  @ForeignKey(() => UserModel)
  @Column({
    type: DataType.UUID,
    allowNull: true
  })
  declare cancelled_by: string | undefined;

  @Column({
    type: DataType.BOOLEAN,
    allowNull: true
  })
  declare rider_has_package: boolean | undefined;

  // Guest tracking token for non-registered recipients
  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  declare guest_tracking_token: string | undefined;

  @ForeignKey(() => UserModel)
  @Column({
    type: DataType.UUID,
    allowNull: true
  })
  declare rider_id: string | undefined;

  @BelongsTo(() => UserModel, 'sender_id')
  declare sender: UserModel;

  @BelongsTo(() => UserModel, 'recipient_id')
  declare recipient: UserModel | undefined;

  @BelongsTo(() => UserModel, 'rider_id')
  declare rider: UserModel | undefined;
}