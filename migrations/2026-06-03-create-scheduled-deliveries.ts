import { QueryInterface, DataTypes } from 'sequelize';

export const up = async (queryInterface: QueryInterface): Promise<void> => {
  await queryInterface.createTable('scheduled_deliveries', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    package_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    schedule_type: {
      type: DataTypes.ENUM('IMMEDIATE', 'SCHEDULED', 'SAME_DAY', 'NEXT_DAY'),
      allowNull: false
    },
    scheduled_for: {
      type: DataTypes.DATE,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('PENDING', 'ACTIVE', 'DISPATCHED', 'CANCELLED'),
      allowNull: false,
      defaultValue: 'PENDING'
    },
    dispatched_at: {
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

  await queryInterface.addIndex('scheduled_deliveries', ['package_id']);
  await queryInterface.addIndex('scheduled_deliveries', ['status', 'scheduled_for']);
};

export const down = async (queryInterface: QueryInterface): Promise<void> => {
  await queryInterface.dropTable('scheduled_deliveries');
};
