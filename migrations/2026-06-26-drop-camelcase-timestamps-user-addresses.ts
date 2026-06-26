import { QueryInterface } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  const tableDescription = await queryInterface.describeTable('user_addresses');

  // Drop camelCase duplicates — Sequelize with underscored:true uses snake_case columns
  if (tableDescription['createdAt']) {
    await queryInterface.removeColumn('user_addresses', 'createdAt');
  }
  if (tableDescription['updatedAt']) {
    await queryInterface.removeColumn('user_addresses', 'updatedAt');
  }
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  const { DataTypes } = await import('sequelize');
  await queryInterface.addColumn('user_addresses', 'createdAt', {
    type: DataTypes.DATE,
    allowNull: true,
  });
  await queryInterface.addColumn('user_addresses', 'updatedAt', {
    type: DataTypes.DATE,
    allowNull: true,
  });
}
