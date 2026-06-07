import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.createTable('riders', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
    },
    rider_id: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
    },
    business_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    license_number: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    vehicle_type: {
      type: DataTypes.ENUM('BICYCLE', 'MOTORCYCLE'),
      allowNull: false,
    },
    vehicle_plate: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    profile_photo: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    license_photo: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    vehicle_photo: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    verification_status: {
      type: DataTypes.ENUM('PENDING', 'VERIFIED', 'REJECTED'),
      defaultValue: 'PENDING',
      allowNull: false,
    },
    is_available: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
    rider_type: {
      type: DataTypes.ENUM('INDEPENDENT', 'BUSINESS_MANAGED'),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('AVAILABLE', 'BUSY', 'OFFLINE'),
      defaultValue: 'OFFLINE',
      allowNull: false,
    },
    current_latitude: {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: true,
    },
    current_longitude: {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: true,
    },
    referral_code: {
      type: DataTypes.STRING(20),
      allowNull: true,
      unique: true,
    },
    referral_code_updated_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  });
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.dropTable('riders');
}
