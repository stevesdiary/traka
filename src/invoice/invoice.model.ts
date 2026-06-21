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
  declare tenant_id: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true
  })
  declare invoice_number: string;

  @Column({
    type: DataType.DECIMAL(20, 2),
    allowNull: false
  })
  declare subtotal: number;

  @Column({
    type: DataType.DECIMAL(20, 2),
    allowNull: false
  })
  declare platform_fee: number;

  @Column({
    type: DataType.DECIMAL(20, 2),
    allowNull: false
  })
  declare total_amount: number;

  @Column({
    type: DataType.ENUM('PENDING', 'PAID', 'OVERDUE', 'CANCELLED'),
    defaultValue: 'PENDING'
  })
  declare status: string;

  @Column({
    type: DataType.DATE,
    allowNull: false
  })
  declare due_date: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true
  })
  declare paid_at: Date | undefined;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0
  })
  declare package_count: number;

  @Column({
    type: DataType.DATE,
    allowNull: false
  })
  declare period_start: Date;

  @Column({
    type: DataType.DATE,
    allowNull: false
  })
  declare period_end: Date;

  @BelongsTo(() => TenantModel)
  declare tenant: TenantModel;
}