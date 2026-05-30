import { Table, Column, Model, DataType, PrimaryKey, Default, ForeignKey } from 'sequelize-typescript';
import { TenantModel } from '../tenant/tenant.model.js';
import { UserModel } from '../user/user.model.js';

@Table({
  tableName: 'api_keys',
  timestamps: true,
  underscored: true,
})
export class ApiKeyModel extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => TenantModel)
  @Column({ type: DataType.UUID, allowNull: false })
  declare tenant_id: string;

  @Column({ type: DataType.STRING, allowNull: false })
  declare name: string;

  @Column({ type: DataType.STRING(16), allowNull: false })
  declare key_prefix: string;

  @Column({ type: DataType.STRING(64), allowNull: false, unique: true })
  declare key_hash: string;

  @Column({
    type: DataType.ENUM('ACTIVE', 'REVOKED'),
    defaultValue: 'ACTIVE',
    allowNull: false,
  })
  declare status: 'ACTIVE' | 'REVOKED';

  @Column({ type: DataType.DATE, allowNull: true })
  declare last_used_at: Date | null;

  @Column({ type: DataType.DATE, allowNull: true })
  declare expires_at: Date | null;

  @ForeignKey(() => UserModel)
  @Column({ type: DataType.UUID, allowNull: false })
  declare created_by: string;
}
