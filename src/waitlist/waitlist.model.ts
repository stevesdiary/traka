import { Table, Column, Model, DataType, PrimaryKey, Default } from 'sequelize-typescript';

@Table({ tableName: 'waitlist', timestamps: true })
export class WaitlistModel extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @Column({ type: DataType.STRING, allowNull: false })
  declare name: string;

  @Column({ type: DataType.STRING, allowNull: false })
  declare email: string;

  @Column({ type: DataType.STRING, allowNull: false })
  declare location: string;

  @Column({ type: DataType.STRING, allowNull: true })
  declare city: string;

  @Column({ type: DataType.DECIMAL(10, 7), allowNull: true })
  declare latitude: number;

  @Column({ type: DataType.DECIMAL(10, 7), allowNull: true })
  declare longitude: number;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  declare notified: boolean;
}
