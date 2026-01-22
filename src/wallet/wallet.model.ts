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
  user_id!: string;

  @Column({
    type: DataType.DECIMAL(20, 2),
    defaultValue: 0.00,
    allowNull: false
  })
  balance!: number;

  @Column({
    type: DataType.DECIMAL(20, 2),
    defaultValue: -2000.00,
    allowNull: false
  })
  credit_limit!: number;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true
  })
  is_active!: boolean;

  @BelongsTo(() => UserModel)
  user!: UserModel;
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
  wallet_id!: string;

  @Column({
    type: DataType.DECIMAL(20, 2),
    allowNull: false
  })
  amount!: number;

  @Column({
    type: DataType.ENUM('COMMISSION_DEBIT', 'TRIP_EARNING', 'DEBT_REPAYMENT', 'WITHDRAWAL', 'DEPOSIT'),
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

  @BelongsTo(() => WalletModel)
  wallet!: WalletModel;
}