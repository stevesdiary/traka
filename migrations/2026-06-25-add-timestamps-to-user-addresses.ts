import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  const tableDescription = await queryInterface.describeTable('user_addresses');

  if (!tableDescription['updated_at']) {
    await queryInterface.addColumn('user_addresses', 'updated_at', {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    });
  }

  if (!tableDescription['created_at']) {
    await queryInterface.addColumn('user_addresses', 'created_at', {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    });
  }
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.removeColumn('user_addresses', 'updated_at');
  await queryInterface.removeColumn('user_addresses', 'created_at');
}
