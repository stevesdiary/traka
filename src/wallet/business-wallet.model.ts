import { Table, Column, Model, DataType, PrimaryKey, Default, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { TenantModel } from '../tenant/tenant.model.js';

@Table({
  tableName: 'business_wallets',
  timestamps: true
})
export class BusinessWalletModel extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => TenantModel)
  @Column({
    type: DataType.UUID,
    allowNull: false,
    unique: true
  })
  tenant_id!: string;

  @Column({
    type: DataType.DECIMAL(20, 2),
    defaultValue: 0.00,
    allowNull: false
  })
  balance!: number;

  @Column({
    type: DataType.DECIMAL(20, 2),
    defaultValue: 1000.00,
    allowNull: false
  })
  auto_recharge_threshold!: number;

  @Column({
    type: DataType.DECIMAL(20, 2),
    defaultValue: 5000.00,
    allowNull: false
  })
  auto_recharge_amount!: number;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true
  })
  auto_recharge_enabled!: boolean;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true
  })
  is_active!: boolean;

  @BelongsTo(() => TenantModel)
  tenant!: TenantModel;
}

@Table({
  tableName: 'business_wallet_transactions',
  timestamps: true
})
export class BusinessWalletTransactionModel extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => BusinessWalletModel)
  @Column(DataType.UUID)
  wallet_id!: string;

  @Column({
    type: DataType.DECIMAL(20, 2),
    allowNull: false
  })
  amount!: number;

  @Column({
    type: DataType.ENUM('PLATFORM_FEE', 'RECHARGE', 'REFUND', 'ADJUSTMENT'),
    allowNull: false
  })
  type!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true
  })
  reference!: string;

  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  description?: string;

  @Column({
    type: DataType.UUID,
    allowNull: true
  })
  package_id?: string;

  @BelongsTo(() => BusinessWalletModel)
  wallet!: BusinessWalletModel;
}