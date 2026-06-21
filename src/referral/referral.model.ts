import { Table, Column, Model, DataType, PrimaryKey, Default } from 'sequelize-typescript';

@Table({
  tableName: 'referrals',
  timestamps: true,
  underscored: true
})
export class ReferralModel extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  declare referrer_rider_id: string;

  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  declare referred_rider_id: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true
  })
  declare referral_code: string;

  @Column({
    type: DataType.ENUM('PENDING', 'COMPLETED', 'REWARDED'),
    defaultValue: 'PENDING'
  })
  declare status: string;

  @Column({
    type: DataType.DATE,
    allowNull: true
  })
  declare first_delivery_at: Date | undefined;

  @Column({
    type: DataType.DATE,
    allowNull: true
  })
  declare rewarded_at: Date | undefined;

  @Column({
    type: DataType.DECIMAL(10, 2),
    defaultValue: 1000.00
  })
  declare reward_amount: number;
}
