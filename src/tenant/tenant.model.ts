import { Table, Column, Model, DataType, PrimaryKey, Default } from 'sequelize-typescript';

@Table({
  tableName: 'tenants',
  timestamps: true
})
export class TenantModel extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  business_name!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  business_address!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  contact_person!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  phone!: string;

  @Column({
    type: DataType.ENUM('ACTIVE', 'SUSPENDED', 'PENDING'),
    defaultValue: 'PENDING'
  })
  status!: string;
}

export interface Tenant {
  id: string;
  business_name: string;
  business_address: string;
  contact_person: string;
  phone: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'PENDING';
  created_at: Date;
  updated_at: Date;
}