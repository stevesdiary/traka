import { Table, Column, Model, DataType, PrimaryKey, Default, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { UserModel } from '../user/user.model';

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