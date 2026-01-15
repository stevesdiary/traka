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
  package_id!: string;

  @ForeignKey(() => UserModel)
  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  rider_id!: string;

  @ForeignKey(() => UserModel)
  @Column({
    type: DataType.UUID,
    allowNull: false
  })
  rated_by!: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 5
    }
  })
  rating!: number;

  @Column({
    type: DataType.TEXT,
    allowNull: true
  })
  review?: string;

  @BelongsTo(() => PackageModel)
  package!: PackageModel;

  @BelongsTo(() => UserModel, 'rider_id')
  rider!: UserModel;

  @BelongsTo(() => UserModel, 'rated_by')
  rater!: UserModel;
}
