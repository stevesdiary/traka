import { Table, Column, Model, DataType, PrimaryKey, Default } from 'sequelize-typescript';

@Table({ tableName: 'service_areas', timestamps: true, underscored: true })
export class ServiceAreaModel extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @Column({ type: DataType.STRING, allowNull: false, unique: true })
  declare city: string;

  @Column({ type: DataType.STRING, allowNull: false })
  declare state: string;

  @Column({ type: DataType.STRING, allowNull: false })
  declare country: string;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  declare is_active: boolean;
}
