import { Table, Column, Model, DataType, PrimaryKey, Default, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { UserModel } from '../user/user.model.js';

@Table({
  tableName: 'refresh_tokens',
  timestamps: true,
  underscored: true
})
export class RefreshTokenModel extends Model {
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
    allowNull: false,
    unique: true
  })
  token_hash!: string;

  @Column({
    type: DataType.DATE,
    allowNull: false
  })
  expires_at!: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true
  })
  revoked_at?: Date;

  @BelongsTo(() => UserModel)
  user!: UserModel;
}
