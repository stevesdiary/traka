import { Table, Column, Model, DataType, PrimaryKey, Default, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { UserModel } from '../user/user.model.js';

@Table({
  tableName: 'user_addresses',
  timestamps: true
})
export class UserAddressModel extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => UserModel)
  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  user_id!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  label!: string; // Home, Work, Office, etc.

  @Column({
    type: DataType.TEXT,
    allowNull: false
  })
  address!: string;

  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  city?: string;

  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  state?: string;

  @Column({
    type: DataType.DECIMAL(10, 8),
    allowNull: true
  })
  latitude?: number;

  @Column({
    type: DataType.DECIMAL(11, 8),
    allowNull: true
  })
  longitude?: number;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false
  })
  is_default!: boolean;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true
  })
  is_active!: boolean;

  @BelongsTo(() => UserModel)
  user!: UserModel;
}