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
  declare user_id: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true
  })
  declare token_hash: string;

  @Column({
    type: DataType.DATE,
    allowNull: false
  })
  declare expires_at: Date;

  @Column({
    type: DataType.DATE,
    allowNull: true
  })
  declare revoked_at: Date | null;

  @BelongsTo(() => UserModel)
  declare user: UserModel;
}
