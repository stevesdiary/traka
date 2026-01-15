import { Table, Column, Model, DataType, PrimaryKey, Default, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { UserModel } from '../user/user.model.js';

@Table({
  tableName: 'notifications',
  timestamps: true
})
export class NotificationModel extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => UserModel)
  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  user_id!: string;

  @Column({
    type: DataType.ENUM('DELIVERY_ASSIGNED', 'PICKUP_CONFIRMED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'PAYMENT_RECEIVED', 'RATING_RECEIVED', 'RIDER_ASSIGNED', 'RIDER_ARRIVED'),
    allowNull: false
  })
  type!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  title!: string;

  @Column({
    type: DataType.TEXT,
    allowNull: false
  })
  message!: string;

  @Column({
    type: DataType.JSON,
    allowNull: true
  })
  data?: any;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false
  })
  is_read!: boolean;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false
  })
  is_sent!: boolean;

  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  push_token?: string;

  @BelongsTo(() => UserModel)
  user!: UserModel;
}

@Table({
  tableName: 'notification_preferences',
  timestamps: true
})
export class NotificationPreferenceModel extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => UserModel)
  @Column({
    type: DataType.UUID,
    allowNull: false,
    unique: true
  })
  user_id!: string;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true
  })
  push_enabled!: boolean;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true
  })
  sms_enabled!: boolean;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true
  })
  email_enabled!: boolean;

  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  fcm_token?: string;

  @BelongsTo(() => UserModel)
  user!: UserModel;
}
