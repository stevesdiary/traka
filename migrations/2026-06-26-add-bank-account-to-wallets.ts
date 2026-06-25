import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  // Add bank account fields to wallets
  await queryInterface.addColumn('wallets', 'bank_name', {
    type: DataTypes.STRING,
    allowNull: true,
  });
  await queryInterface.addColumn('wallets', 'bank_code', {
    type: DataTypes.STRING(10),
    allowNull: true,
  });
  await queryInterface.addColumn('wallets', 'account_number', {
    type: DataTypes.STRING(20),
    allowNull: true,
  });
  await queryInterface.addColumn('wallets', 'account_name', {
    type: DataTypes.STRING,
    allowNull: true,
  });
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.removeColumn('wallets', 'bank_name');
  await queryInterface.removeColumn('wallets', 'bank_code');
  await queryInterface.removeColumn('wallets', 'account_number');
  await queryInterface.removeColumn('wallets', 'account_name');
}
