import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.createTable('referrals', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
    },
    referrer_rider_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    referred_rider_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    referral_code: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    status: {
      type: DataTypes.ENUM('PENDING', 'COMPLETED', 'REWARDED'),
      defaultValue: 'PENDING',
      allowNull: false,
    },
    first_delivery_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    rewarded_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    reward_amount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 1000.00,
      allowNull: false,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  });
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.dropTable('referrals');
}
