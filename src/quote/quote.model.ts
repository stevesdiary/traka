import { Table, Column, Model, DataType, PrimaryKey, Default, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { UserModel } from '../user/user.model.js';

@Table({
  tableName: 'quotes',
  timestamps: true,
  underscored: true
})
export class QuoteModel extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true
  })
  declare quote_code: string;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  declare pickup_address: string;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  declare delivery_address: string;

  @Column({
    type: DataType.ENUM('SMALL', 'MEDIUM', 'LARGE'),
    allowNull: false
  })
  declare package_size: string;

  @Column({
    type: DataType.DECIMAL(5, 2),
    allowNull: true
  })
  declare package_weight?: number;

  @Column({
    type: DataType.ENUM('STANDARD', 'EXPRESS', 'SAME_DAY'),
    allowNull: false
  })
  declare delivery_speed: string;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: false
  })
  declare estimated_price: number;

  @Column({
    type: DataType.STRING(3),
    defaultValue: 'NGN'
  })
  declare currency: string;

  @Column({
    type: DataType.DECIMAL(8, 2),
    allowNull: true
  })
  declare estimated_distance_km?: number;

  @Column({
    type: DataType.DATE,
    allowNull: false
  })
  declare expires_at: Date;

  @ForeignKey(() => UserModel)
  @Column({
    type: DataType.UUID,
    allowNull: true
  })
  declare created_by_user_id?: string;

  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  declare anonymous_session_id?: string;

  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  declare contact_email?: string;

  @Column({
    type: DataType.ENUM('ACTIVE', 'EXPIRED', 'CONVERTED'),
    defaultValue: 'ACTIVE'
  })
  declare status: string;

  @Column({
    type: DataType.UUID,
    allowNull: true
  })
  declare converted_to_package_id?: string;

  @BelongsTo(() => UserModel, 'created_by_user_id')
  creator?: UserModel;
}
