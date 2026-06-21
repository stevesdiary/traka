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
  declare tenant_id: string;

  @Column({
    type: DataType.DECIMAL(20, 2),
    defaultValue: 0.00,
    allowNull: false
  })
  declare balance: number;

  @Column({
    type: DataType.DECIMAL(20, 2),
    defaultValue: 1000.00,
    allowNull: false
  })
  declare auto_recharge_threshold: number;

  @Column({
    type: DataType.DECIMAL(20, 2),
    defaultValue: 5000.00,
    allowNull: false
  })
  declare auto_recharge_amount: number;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true
  })
  declare auto_recharge_enabled: boolean;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true
  })
  declare is_active: boolean;

  @BelongsTo(() => TenantModel)
  declare tenant: TenantModel;
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
  declare wallet_id: string;

  @Column({
    type: DataType.DECIMAL(20, 2),
    allowNull: false
  })
  declare amount: number;

  @Column({
    type: DataType.ENUM('PLATFORM_FEE', 'RECHARGE', 'REFUND', 'ADJUSTMENT'),
    allowNull: false
  })
  declare type: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true
  })
  declare reference: string;

  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  declare description: string | undefined;

  @Column({
    type: DataType.UUID,
    allowNull: true
  })
  declare package_id: string | undefined;

  @BelongsTo(() => BusinessWalletModel)
  declare wallet: BusinessWalletModel;
}