import { QueryInterface, DataTypes } from 'sequelize';

export const up = async (queryInterface: QueryInterface): Promise<void> => {
  await queryInterface.createTable('promotions', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    code: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    discount_type: {
      type: DataTypes.ENUM('PERCENTAGE', 'FIXED'),
      allowNull: false
    },
    discount_value: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    max_uses: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    max_uses_per_user: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    start_date: {
      type: DataTypes.DATE,
      allowNull: false
    },
    end_date: {
      type: DataTypes.DATE,
      allowNull: false
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    created_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'SET NULL'
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

  await queryInterface.createTable('promotion_usages', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    promotion_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'promotions',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    package_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'packages',
        key: 'id'
      },
      onDelete: 'SET NULL'
    },
    discount_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true
    },
    currency: {
      type: DataTypes.STRING(3),
      defaultValue: 'NGN'
    },
    used_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
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

  await queryInterface.addIndex('promotions', ['code']);
  await queryInterface.addIndex('promotions', ['is_active']);
  await queryInterface.addIndex('promotions', ['start_date']);
  await queryInterface.addIndex('promotions', ['end_date']);

  await queryInterface.addIndex('promotion_usages', ['promotion_id']);
  await queryInterface.addIndex('promotion_usages', ['user_id']);
  await queryInterface.addIndex('promotion_usages', ['package_id']);
  await queryInterface.addIndex('promotion_usages', ['used_at']);
};

export const down = async (queryInterface: QueryInterface): Promise<void> => {
  await queryInterface.dropTable('promotion_usages');
  await queryInterface.dropTable('promotions');
};
