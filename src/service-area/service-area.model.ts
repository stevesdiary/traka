import { Table, Column, Model, DataType, PrimaryKey, Default } from 'sequelize-typescript';

@Table({ tableName: 'service_areas', timestamps: true, underscored: true })
export class ServiceAreaModel extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @Column({ type: DataType.STRING, allowNull: false, unique: true })
  city!: string;

  @Column({ type: DataType.STRING, allowNull: false })
  state!: string;

  @Column({ type: DataType.STRING, allowNull: false })
  country!: string;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  is_active!: boolean;
}
