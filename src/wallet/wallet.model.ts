import { Table, Column, Model, DataType, PrimaryKey, Default, ForeignKey, BelongsTo, HasMany } from 'sequelize-typescript';
import { UserModel } from '../user/user.model.js';

@Table({
  tableName: 'wallets',
  timestamps: true,
  underscored: true,
  paranoid: true
})
export class WalletModel extends Model {
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
    type: DataType.DECIMAL(20, 2),
    defaultValue: 0.00,
    allowNull: false
  })
  declare balance: number;

  @Column({
    type: DataType.DECIMAL(20, 2),
    defaultValue: -2000.00,
    allowNull: false
  })
  declare credit_limit: number;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true
  })
  declare is_active: boolean;

  @Column({ type: DataType.STRING, allowNull: true })
  declare bank_name: string | undefined;

  @Column({ type: DataType.STRING(10), allowNull: true })
  declare bank_code: string | undefined;

  @Column({ type: DataType.STRING(20), allowNull: true })
  declare account_number: string | undefined;

  @Column({ type: DataType.STRING, allowNull: true })
  declare account_name: string | undefined;

  @BelongsTo(() => UserModel)
  declare user: UserModel;
}

@Table({
  tableName: 'wallet_transactions',
  timestamps: true
})
export class WalletTransactionModel extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => WalletModel)
  @Column(DataType.UUID)
  declare wallet_id: string;

  @Column({
    type: DataType.DECIMAL(20, 2),
    allowNull: false
  })
  declare amount: number;

  @Column({
    type: DataType.ENUM('COMMISSION_DEBIT', 'TRIP_EARNING', 'DEBT_REPAYMENT', 'WITHDRAWAL', 'DEPOSIT', 'DELIVERY_PAYMENT'),
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

  @BelongsTo(() => WalletModel)
  declare wallet: WalletModel;
}