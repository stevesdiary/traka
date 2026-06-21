import { Table, Column, Model, DataType, PrimaryKey, Default, ForeignKey, BelongsTo, HasMany } from 'sequelize-typescript';
import { UserModel } from '../user/user.model.js';
import { RatingModel } from '../rating/rating.model.js';

@Table({
  tableName: 'riders',
  timestamps: true,
  underscored: true,
  paranoid: true
})
export class RiderModel extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @Column({
    type: DataType.STRING(20),
    allowNull: false,
    unique: true
  })
  declare rider_id: string;

  @ForeignKey(() => UserModel)
  @Column(DataType.UUID)
  declare user_id: string;

  @Column({
    type: DataType.UUID,
    allowNull: true
  })
  declare business_id: string | undefined;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  declare license_number: string;

  @Column({
    type: DataType.ENUM('BICYCLE', 'MOTORCYCLE'),
    allowNull: false
  })
  declare vehicle_type: string;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  declare vehicle_plate: string;

  @Column(DataType.STRING)
  declare profile_photo: string | undefined;

  @Column(DataType.STRING)
  declare license_photo: string | undefined;

  @Column(DataType.STRING)
  declare vehicle_photo: string | undefined;

  @Column({
    type: DataType.ENUM('PENDING', 'VERIFIED', 'REJECTED'),
    defaultValue: 'PENDING'
  })
  declare verification_status: string;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false
  })
  declare is_available: boolean;

  @Column({
    type: DataType.ENUM('INDEPENDENT', 'BUSINESS_MANAGED'),
    allowNull: false
  })
  declare rider_type: string;

  @Column({
    type: DataType.ENUM('AVAILABLE', 'BUSY', 'OFFLINE'),
    defaultValue: 'OFFLINE'
  })
  declare status: string;

  @Column(DataType.DECIMAL(10, 8))
  declare current_latitude: number | undefined;

  @Column(DataType.DECIMAL(11, 8))
  declare current_longitude: number | undefined;

  @Column({
    type: DataType.STRING(20),
    allowNull: true,
    unique: true
  })
  declare referral_code: string | undefined;

  @Column({
    type: DataType.DATE,
    allowNull: true
  })
  declare referral_code_updated_at: Date | undefined;

  @BelongsTo(() => UserModel)
  declare user: UserModel;

  @HasMany(() => RatingModel, 'rider_id')
  declare ratings: RatingModel[];
}

export interface RiderProfile {
  id: string;
  rider_id: string;
  user_id: string;
  business_id?: string;
  license_number: string;
  vehicle_type: 'BICYCLE' | 'MOTORCYCLE';
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
  avg_rating?: number;
  total_ratings?: number;
  created_at: Date;
  updated_at: Date;
}

export interface RiderRegistration {
  email: string;
  password: string;
  license_number: string;
  vehicle_type: 'BICYCLE' | 'MOTORCYCLE';
  vehicle_plate: string;
  business_id?: string;
}
