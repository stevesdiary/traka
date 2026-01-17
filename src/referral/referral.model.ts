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
  referrer_rider_id!: string;

  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  referred_rider_id!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true
  })
  referral_code!: string;

  @Column({
    type: DataType.ENUM('PENDING', 'COMPLETED', 'REWARDED'),
    defaultValue: 'PENDING'
  })
  status!: string;

  @Column({
    type: DataType.DATE,
    allowNull: true
  })
  first_delivery_at?: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true
  })
  rewarded_at?: Date;

  @Column({
    type: DataType.DECIMAL(10, 2),
    defaultValue: 1000.00
  })
  reward_amount!: number;
}
