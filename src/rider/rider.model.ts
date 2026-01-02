import { Table, Column, Model, DataType, PrimaryKey, Default, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { UserModel } from '../user/user.model.js';

@Table({
  tableName: 'riders',
  timestamps: true,
  underscored: true
})
export class RiderModel extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => UserModel)
  @Column(DataType.UUID)
  user_id!: string;

  @Column({
    type: DataType.UUID,
    allowNull: true
  })
  business_id?: string;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  full_name!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  phone!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  license_number!: string;

  @Column({
    type: DataType.ENUM('BICYCLE', 'MOTORCYCLE', 'CAR', 'VAN', 'TRUCK'),
    allowNull: false
  })
  vehicle_type!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  vehicle_plate!: string;

  @Column(DataType.STRING)
  profile_photo?: string;

  @Column(DataType.STRING)
  license_photo?: string;

  @Column(DataType.STRING)
  vehicle_photo?: string;

  @Column({
    type: DataType.ENUM('PENDING', 'VERIFIED', 'REJECTED'),
    defaultValue: 'PENDING'
  })
  verification_status!: string;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false
  })
  is_available!: boolean;

  @Column({
    type: DataType.ENUM('INDEPENDENT', 'BUSINESS_MANAGED'),
    allowNull: false
  })
  rider_type!: string;

  @Column({
    type: DataType.ENUM('AVAILABLE', 'BUSY', 'OFFLINE'),
    defaultValue: 'OFFLINE'
  })
  status!: string;

  @Column(DataType.DECIMAL(10, 8))
  current_latitude?: number;

  @Column(DataType.DECIMAL(11, 8))
  current_longitude?: number;

  @BelongsTo(() => UserModel)
  user!: UserModel;
}

export interface RiderProfile {
  id: string;
  user_id: string;
  business_id?: string;
  full_name: string;
  phone: string;
  license_number: string;
  vehicle_type: 'BICYCLE' | 'MOTORCYCLE' | 'CAR' | 'VAN' | 'TRUCK';
  vehicle_plate: string;
  profile_photo?: string;
  license_photo?: string;
  vehicle_photo?: string;
  verification_status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  is_available: boolean;
  rider_type: 'INDEPENDENT' | 'BUSINESS_MANAGED';
  status: 'AVAILABLE' | 'BUSY' | 'OFFLINE';
  current_latitude?: number;
  current_longitude?: number;
  created_at: Date;
  updated_at: Date;
}

export interface RiderRegistration {
  email: string;
  password: string;
  full_name: string;
  phone: string;
  license_number: string;
  vehicle_type: 'BICYCLE' | 'MOTORCYCLE' | 'CAR' | 'VAN' | 'TRUCK';
  vehicle_plate: string;
  business_id?: string;
}