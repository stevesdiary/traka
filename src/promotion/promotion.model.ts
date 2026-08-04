import { Table, Column, Model, DataType, PrimaryKey, Default, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { UserModel } from '../user/user.model.js';
import { PackageModel } from '../package/package.model.js';

@Table({
  tableName: 'promotions',
  timestamps: true,
  underscored: true
})
export class PromotionModel extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true
  })
  declare code: string;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  declare name: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  declare description: string | undefined;

  @Column({
    type: DataType.ENUM('PERCENTAGE', 'FIXED'),
    allowNull: false
  })
  declare discount_type: string;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: false
  })
  declare discount_value: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true
  })
  declare max_uses: number | undefined;

  @Column({
    type: DataType.INTEGER,
    allowNull: true
  })
  declare max_uses_per_user: number | undefined;

  @Column({
    type: DataType.DATE,
    allowNull: false
  })
  declare start_date: Date;

  @Column({
    type: DataType.DATE,
    allowNull: false
  })
  declare end_date: Date;

  @Column({
    type: DataType.ENUM('DELIVERY_FEE', 'TOTAL'),
    defaultValue: 'DELIVERY_FEE',
    allowNull: false
  })
  declare applies_to: string;

  @Column({
    type: DataType.ENUM('ALL', 'CUSTOMERS', 'RIDERS'),
    defaultValue: 'ALL',
    allowNull: false
  })
  declare target_audience: string;

  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  declare season: string | undefined;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: true
  })
  declare min_amount: number | undefined;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
    allowNull: false
  })
  declare stackable: boolean;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true
  })
  declare is_active: boolean;

  @ForeignKey(() => UserModel)
  @Column({
    type: DataType.UUID,
    allowNull: true
  })
  declare created_by: string | undefined;

  @BelongsTo(() => UserModel, 'created_by')
  declare creator: UserModel | undefined;
}

@Table({
  tableName: 'promotion_usages',
  timestamps: true,
  underscored: true
})
export class PromotionUsageModel extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => PromotionModel)
  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  declare promotion_id: string;

  @ForeignKey(() => UserModel)
  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  declare user_id: string;

  @ForeignKey(() => PackageModel)
  @Column({
    type: DataType.UUID,
    allowNull: true
  })
  declare package_id: string | undefined;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: true
  })
  declare discount_amount: number | undefined;

  @Column({
    type: DataType.STRING(3),
    defaultValue: 'NGN'
  })
  declare currency: string;

  @Column({
    type: DataType.DATE,
    allowNull: false
  })
  declare used_at: Date;

  @BelongsTo(() => PromotionModel)
  declare promotion: PromotionModel;

  @BelongsTo(() => UserModel, 'user_id')
  declare user: UserModel;

  @BelongsTo(() => PackageModel, 'package_id')
  declare package: PackageModel | undefined;
}
