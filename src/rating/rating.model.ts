import { Table, Column, Model, DataType, PrimaryKey, Default, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { UserModel } from '../user/user.model.js';
import { PackageModel } from '../package/package.model.js';

@Table({
  tableName: 'ratings',
  timestamps: true
})
export class RatingModel extends Model {
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
  declare rider_id: string;

  @ForeignKey(() => UserModel)
  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  declare rated_by: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    validate: { min: 1, max: 5 }
  })
  declare rating: number;

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  declare review: string | undefined;

  @BelongsTo(() => PackageModel)
  declare package: PackageModel;

  @BelongsTo(() => UserModel, 'rider_id')
  declare rider: UserModel;

  @BelongsTo(() => UserModel, 'rated_by')
  declare rater: UserModel;
}
