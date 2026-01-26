import { QueryInterface, DataTypes } from 'sequelize';

export const up = async (queryInterface: QueryInterface): Promise<void> => {
  await queryInterface.createTable('quotes', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    quote_code: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    pickup_address: {
      type: DataTypes.STRING,
      allowNull: false
    },
    delivery_address: {
      type: DataTypes.STRING,
      allowNull: false
    },
    package_size: {
      type: DataTypes.ENUM('SMALL', 'MEDIUM', 'LARGE'),
      allowNull: false
    },
    package_weight: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true
    },
    delivery_speed: {
      type: DataTypes.ENUM('STANDARD', 'EXPRESS', 'SAME_DAY'),
      allowNull: false
    },
    estimated_price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    currency: {
      type: DataTypes.STRING(3),
      defaultValue: 'NGN'
    },
    estimated_distance_km: {
      type: DataTypes.DECIMAL(8, 2),
      allowNull: true
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false
    },
    created_by_user_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'SET NULL'
    },
    anonymous_session_id: {
      type: DataTypes.STRING,
      allowNull: true
    },
    contact_email: {
      type: DataTypes.STRING,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('ACTIVE', 'EXPIRED', 'CONVERTED'),
      defaultValue: 'ACTIVE'
    },
    converted_to_package_id: {
      type: DataTypes.UUID,
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

  // Add indexes for performance
  await queryInterface.addIndex('quotes', ['quote_code']);
  await queryInterface.addIndex('quotes', ['created_by_user_id']);
  await queryInterface.addIndex('quotes', ['anonymous_session_id']);
  await queryInterface.addIndex('quotes', ['status']);
  await queryInterface.addIndex('quotes', ['expires_at']);
};

export const down = async (queryInterface: QueryInterface): Promise<void> => {
  await queryInterface.dropTable('quotes');
};
