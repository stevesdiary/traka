import { Table, Column, Model, DataType, PrimaryKey, Unique } from 'sequelize-typescript';

@Table({ tableName: 'system_configs', timestamps: true })
export class SystemConfigModel extends Model {
  @PrimaryKey
  @Unique
  @Column({ type: DataType.STRING, allowNull: false })
  declare key: string;

  @Column({ type: DataType.STRING, allowNull: false })
  declare value: string;
}
