import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.createTable('business_wallets', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
    },
    tenant_id: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      references: { model: 'tenants', key: 'id' },
    },
    balance: {
      type: DataTypes.DECIMAL(20, 2),
      defaultValue: 0.00,
      allowNull: false,
    },
    auto_recharge_threshold: {
      type: DataTypes.DECIMAL(20, 2),
      defaultValue: 1000.00,
      allowNull: false,
    },
    auto_recharge_amount: {
      type: DataTypes.DECIMAL(20, 2),
      defaultValue: 5000.00,
      allowNull: false,
    },
    auto_recharge_enabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
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

  await queryInterface.createTable('business_wallet_transactions', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
    },
    wallet_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'business_wallets', key: 'id' },
    },
    amount: {
      type: DataTypes.DECIMAL(20, 2),
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM('PLATFORM_FEE', 'RECHARGE', 'REFUND', 'ADJUSTMENT'),
      allowNull: false,
    },
    reference: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    package_id: {
      type: DataTypes.UUID,
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
  });
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.dropTable('business_wallet_transactions');
  await queryInterface.dropTable('business_wallets');
}
