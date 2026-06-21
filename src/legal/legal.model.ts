import { Table, Column, Model, DataType, PrimaryKey, Default } from 'sequelize-typescript';

@Table({
  tableName: 'legal_content',
  timestamps: true
})
export class LegalContentModel extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @Column({
    type: DataType.ENUM('FAQ', 'TERMS_OF_SERVICE', 'PRIVACY_POLICY', 'COMMISSION_POLICY'),
    allowNull: false
  })
  declare type: string;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  declare title: string;

  @Column({
    type: DataType.TEXT,
    allowNull: false
  })
  declare content: string;

  @Column({
    type: DataType.STRING,
    allowNull: true
  })
  declare category: string | undefined;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0
  })
  declare order_index: number;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true
  })
  declare is_active: boolean;

  @Column({
    type: DataType.STRING,
    defaultValue: '1.0.0'
  })
  declare content_version: string;
}