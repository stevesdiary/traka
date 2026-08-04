import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.addColumn('users', 'referral_code', {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true
  });

  await queryInterface.addColumn('users', 'referral_code_updated_at', {
    type: DataTypes.DATE,
    allowNull: true
  });

  await queryInterface.addColumn('packages', 'discount_percent', {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true
  });

  await queryInterface.addColumn('packages', 'discount_amount', {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  });

  await queryInterface.createTable('customer_referrals', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false
    },
    referrer_user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE'
    },
    referred_user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onDelete: 'CASCADE'
    },
    referral_code: {
      type: DataTypes.STRING,
      allowNull: false
    },
    discount_percent: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 20.0,
      allowNull: false
    },
    discount_max_orders: {
      type: DataTypes.INTEGER,
      defaultValue: 3,
      allowNull: false
    },
    discount_orders_used: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('ACTIVE', 'COMPLETED'),
      defaultValue: 'ACTIVE',
      allowNull: false
    },
    completed_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  });

  await queryInterface.addIndex('customer_referrals', ['referrer_user_id']);
  await queryInterface.addIndex('customer_referrals', ['referred_user_id']);
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.dropTable('customer_referrals');
  await queryInterface.removeColumn('packages', 'discount_amount');
  await queryInterface.removeColumn('packages', 'discount_percent');
  await queryInterface.removeColumn('users', 'referral_code_updated_at');
  await queryInterface.removeColumn('users', 'referral_code');
}
