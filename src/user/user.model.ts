import { Table, Column, Model, DataType, Default } from 'sequelize-typescript';

@Table({
  tableName: 'users',
  timestamps: true,
  underscored: true,
  paranoid: true
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
    allowNull: false
  })
  declare first_name: string;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  declare surname: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true
  })
  declare email: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
    unique: true
  })
  declare phone?: string;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  declare password_hash: string;

  @Column({
    type: DataType.ENUM('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'RIDER', 'USER', 'BUSINESS_OWNER'),
    allowNull: false
  })
  declare role: string;

  @Column({
    type: DataType.ENUM('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'RIDER', 'USER', 'BUSINESS_OWNER'),
    allowNull: false
  })
  declare type: string;

  @Column({
    type: DataType.UUID,
    allowNull: true
  })
  declare tenant_id: string | null;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false
  })
  declare email_verified: boolean;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false
  })
  declare phone_verified: boolean;

  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  declare profile_photo?: string;

  @Column({
    type: DataType.DATE,
    allowNull: true
  })
  declare terms_accepted_at: Date | null;
}
