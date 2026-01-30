import { QueryInterface, DataTypes } from 'sequelize';

export const up = async (queryInterface: QueryInterface): Promise<void> => {
  // Add payment_method column
  await queryInterface.addColumn('packages', 'payment_method', {
    type: DataTypes.ENUM('DIGITAL', 'CASH'),
    defaultValue: 'DIGITAL',
    allowNull: false
  });

  // Add payment_by column
  await queryInterface.addColumn('packages', 'payment_by', {
    type: DataTypes.ENUM('SENDER', 'RECIPIENT'),
    defaultValue: 'SENDER',
    allowNull: false
  });

  // Add payment_status column
  await queryInterface.addColumn('packages', 'payment_status', {
    type: DataTypes.ENUM('PENDING', 'PAID', 'FAILED'),
    defaultValue: 'PENDING',
    allowNull: false
  });

  // Add paid_at column
  await queryInterface.addColumn('packages', 'paid_at', {
    type: DataTypes.DATE,
    allowNull: true
  });

  // Add indexes for performance
  await queryInterface.addIndex('packages', ['payment_method']);
  await queryInterface.addIndex('packages', ['payment_status']);
};

export const down = async (queryInterface: QueryInterface): Promise<void> => {
  await queryInterface.removeColumn('packages', 'payment_method');
  await queryInterface.removeColumn('packages', 'payment_by');
  await queryInterface.removeColumn('packages', 'payment_status');
  await queryInterface.removeColumn('packages', 'paid_at');
};
