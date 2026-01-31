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
  code!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  name!: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  description?: string;

  @Column({
    type: DataType.ENUM('PERCENTAGE', 'FIXED'),
    allowNull: false
  })
  discount_type!: string;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: false
  })
  discount_value!: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true
  })
  max_uses?: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: true
  })
  max_uses_per_user?: number;

  @Column({
    type: DataType.DATE,
    allowNull: false
  })
  start_date!: Date;

  @Column({
    type: DataType.DATE,
    allowNull: false
  })
  end_date!: Date;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true
  })
  is_active!: boolean;

  @ForeignKey(() => UserModel)
  @Column({
    type: DataType.UUID,
    allowNull: true
  })
  created_by?: string;

  @BelongsTo(() => UserModel, 'created_by')
  creator?: UserModel;
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
  promotion_id!: string;

  @ForeignKey(() => UserModel)
  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  user_id!: string;

  @ForeignKey(() => PackageModel)
  @Column({
    type: DataType.UUID,
    allowNull: true
  })
  package_id?: string;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: true
  })
  discount_amount?: number;

  @Column({
    type: DataType.STRING(3),
    defaultValue: 'NGN'
  })
  currency!: string;

  @Column({
    type: DataType.DATE,
    allowNull: false
  })
  used_at!: Date;

  @BelongsTo(() => PromotionModel)
  promotion!: PromotionModel;

  @BelongsTo(() => UserModel, 'user_id')
  user!: UserModel;

  @BelongsTo(() => PackageModel, 'package_id')
  package?: PackageModel;
}
