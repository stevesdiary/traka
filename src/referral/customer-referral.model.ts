import { Table, Column, Model, DataType, PrimaryKey, Default } from 'sequelize-typescript';

@Table({
  tableName: 'customer_referrals',
  timestamps: true,
  underscored: true
})
export class CustomerReferralModel extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  declare referrer_user_id: string;

  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  declare referred_user_id: string;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  declare referral_code: string;

  @Column({
    type: DataType.DECIMAL(5, 2),
    defaultValue: 20.0
  })
  declare discount_percent: number;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 3
  })
  declare discount_max_orders: number;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0
  })
  declare discount_orders_used: number;

  @Column({
    type: DataType.ENUM('ACTIVE', 'COMPLETED'),
    defaultValue: 'ACTIVE'
  })
  declare status: string;

  @Column({
    type: DataType.DATE,
    allowNull: true
  })
  declare completed_at: Date | undefined;
}
