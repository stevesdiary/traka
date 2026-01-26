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
  quote_code!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  pickup_address!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  delivery_address!: string;

  @Column({
    type: DataType.ENUM('SMALL', 'MEDIUM', 'LARGE'),
    allowNull: false
  })
  package_size!: string;

  @Column({
    type: DataType.DECIMAL(5, 2),
    allowNull: true
  })
  package_weight?: number;

  @Column({
    type: DataType.ENUM('STANDARD', 'EXPRESS', 'SAME_DAY'),
    allowNull: false
  })
  delivery_speed!: string;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: false
  })
  estimated_price!: number;

  @Column({
    type: DataType.STRING(3),
    defaultValue: 'NGN'
  })
  currency!: string;

  @Column({
    type: DataType.DECIMAL(8, 2),
    allowNull: true
  })
  estimated_distance_km?: number;

  @Column({
    type: DataType.DATE,
    allowNull: false
  })
  expires_at!: Date;

  @ForeignKey(() => UserModel)
  @Column({
    type: DataType.UUID,
    allowNull: true
  })
  created_by_user_id?: string;

  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  anonymous_session_id?: string;

  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  contact_email?: string;

  @Column({
    type: DataType.ENUM('ACTIVE', 'EXPIRED', 'CONVERTED'),
    defaultValue: 'ACTIVE'
  })
  status!: string;

  @Column({
    type: DataType.UUID,
    allowNull: true
  })
  converted_to_package_id?: string;

  @BelongsTo(() => UserModel, 'created_by_user_id')
  creator?: UserModel;
}
