import { Table, Column, Model, DataType, PrimaryKey, Default, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { UserModel } from '../user/user.model.js';
import { PackageModel } from '../package/package.model.js';

@Table({
  tableName: 'messages',
  timestamps: true,
  underscored: true
})
export class MessageModel extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => PackageModel)
  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  declare package_id: string;

  @ForeignKey(() => UserModel)
  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  declare sender_id: string;

  @Column({
    type: DataType.TEXT,
    allowNull: false
  })
  declare message: string;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false
  })
  declare is_read: boolean;

  @BelongsTo(() => PackageModel)
  declare package: PackageModel;

  @BelongsTo(() => UserModel, 'sender_id')
  declare sender: UserModel;
}
