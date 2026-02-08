import { Table, Column, Model, DataType, PrimaryKey, Default } from 'sequelize-typescript';

@Table({
  tableName: 'feature_opt_ins',
  timestamps: true,
  underscored: true
})
export class FeatureOptInModel extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  email!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  feature_name!: string;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false
  })
  notified!: boolean;
}
