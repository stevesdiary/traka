import { Table, Column, Model, DataType, PrimaryKey, Default, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { RiderModel } from '../rider/rider.model.js';

@Table({
  tableName: 'commissions',
  timestamps: true,
  underscored: true
})
export class CommissionModel extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => RiderModel)
  @Column(DataType.UUID)
  driver_id!: string;

  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  package_id!: string;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: false
  })
  delivery_fee!: number;

  @Column({
    type: DataType.DECIMAL(5, 4),
    allowNull: false
  })
  commission_rate!: number;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: false
  })
  commission_amount!: number;

  @Column({
    type: DataType.ENUM('PENDING', 'PAID', 'CANCELLED'),
    defaultValue: 'PENDING'
  })
  status!: string;

  @Column(DataType.DATE)
  paid_at?: Date;

  @BelongsTo(() => RiderModel)
  rider!: RiderModel;
}

export interface Commission {
  id: string;
  driver_id: string;
  package_id: string;
  delivery_fee: number;
  commission_rate: number;
  commission_amount: number;
  status: 'PENDING' | 'PAID' | 'CANCELLED';
  created_at: Date;
  paid_at?: Date;
}

export interface CommissionSummary {
  driver_id: string;
  total_deliveries: number;
  total_earnings: number;
  pending_amount: number;
  paid_amount: number;
  period_start: Date;
  period_end: Date;
}