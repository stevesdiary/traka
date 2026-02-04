import { Table, Column, Model, DataType, PrimaryKey, Default, ForeignKey } from 'sequelize-typescript';
import { TenantModel } from '../tenant/tenant.model.js';
import { UserModel } from '../user/user.model.js';

@Table({
  tableName: 'business_members',
  timestamps: true,
  underscored: true,
  paranoid: true
})
export class BusinessMemberModel extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => TenantModel)
  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  declare tenant_id: string;

  @ForeignKey(() => UserModel)
  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  declare user_id: string;

  @Column({
    type: DataType.ENUM('OWNER', 'ADMIN', 'MEMBER'),
    allowNull: false,
    defaultValue: 'OWNER'
  })
  declare role: 'OWNER' | 'ADMIN' | 'MEMBER';

  @Column({
    type: DataType.ENUM('ACTIVE', 'INVITED'),
    allowNull: false,
    defaultValue: 'ACTIVE'
  })
  declare status: 'ACTIVE' | 'INVITED';
}
