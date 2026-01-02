import { Table, Column, Model, DataType, Default } from 'sequelize-typescript';

@Table({
  tableName: 'users',
  timestamps: true,
  underscored: true
})
export class UserModel extends Model <UserModel> {
  @Column({
    type: DataType.UUID,
    primaryKey: true,
    defaultValue: DataType.UUIDV4,
  })
  declare id: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true
  })
  email!: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    unique: true
  })
  phone?: string;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  password_hash!: string;

  @Column({
    type: DataType.ENUM('ADMIN', 'BUSINESS_OWNER', 'RIDER', 'RECIPIENT'),
    allowNull: false
  })
  role!: string;

  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  tenant_id!: string;
}