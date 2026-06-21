import { Table, Column, Model, DataType, PrimaryKey, Default, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { UserModel } from '../user/user.model.js';

@Table({
  tableName: 'user_addresses',
  timestamps: true,
  underscored: true
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
  declare user_id: string;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  declare label: string;

  @Column({
    type: DataType.TEXT,
    allowNull: false
  })
  declare address: string;

  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  declare city: string | undefined;

  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  declare state: string | undefined;

  @Column({
    type: DataType.DECIMAL(10, 8),
    allowNull: true
  })
  declare latitude: number | undefined;

  @Column({
    type: DataType.DECIMAL(11, 8),
    allowNull: true
  })
  declare longitude: number | undefined;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false
  })
  declare is_default: boolean;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true
  })
  declare is_active: boolean;

  @BelongsTo(() => UserModel)
  declare user: UserModel;
}