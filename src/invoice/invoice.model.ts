import { Table, Column, Model, DataType, PrimaryKey, Default, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { TenantModel } from '../tenant/tenant.model.js';

@Table({
  tableName: 'invoices',
  timestamps: true
})
export class InvoiceModel extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => TenantModel)
  @Column(DataType.UUID)
  tenant_id!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true
  })
  invoice_number!: string;

  @Column({
    type: DataType.DECIMAL(20, 2),
    allowNull: false
  })
  subtotal!: number;

  @Column({
    type: DataType.DECIMAL(20, 2),
    allowNull: false
  })
  platform_fee!: number;

  @Column({
    type: DataType.DECIMAL(20, 2),
    allowNull: false
  })
  total_amount!: number;

  @Column({
    type: DataType.ENUM('PENDING', 'PAID', 'OVERDUE', 'CANCELLED'),
    defaultValue: 'PENDING'
  })
  status!: string;

  @Column({
    type: DataType.DATE,
    allowNull: false
  })
  due_date!: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true
  })
  paid_at?: Date;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0
  })
  package_count!: number;

  @Column({
    type: DataType.DATE,
    allowNull: false
  })
  period_start!: Date;

  @Column({
    type: DataType.DATE,
    allowNull: false
  })
  period_end!: Date;

  @BelongsTo(() => TenantModel)
  tenant!: TenantModel;
}