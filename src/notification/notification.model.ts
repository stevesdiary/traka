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
  declare user_id: string;

  @Column({
    type: DataType.ENUM('DELIVERY_ASSIGNED', 'PICKUP_CONFIRMED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'PAYMENT_RECEIVED', 'RATING_RECEIVED', 'RIDER_ASSIGNED', 'RIDER_ARRIVED'),
    allowNull: false
  })
  declare type: string;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  declare title: string;

  @Column({
    type: DataType.TEXT,
    allowNull: false
  })
  declare message: string;

  @Column({
    type: DataType.JSON,
    allowNull: true
  })
  declare data: any;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false
  })
  declare is_read: boolean;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false
  })
  declare is_sent: boolean;

  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  declare push_token: string | undefined;

  @BelongsTo(() => UserModel)
  declare user: UserModel;
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
  declare user_id: string;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true
  })
  declare push_enabled: boolean;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true
  })
  declare sms_enabled: boolean;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true
  })
  declare email_enabled: boolean;

  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  declare fcm_token: string | undefined;

  @BelongsTo(() => UserModel)
  declare user: UserModel;
}
