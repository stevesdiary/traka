import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.addColumn('packages', 'eta_seconds', {
    type: DataTypes.INTEGER,
    allowNull: true,
  });

  await queryInterface.addColumn('packages', 'estimated_arrival_at', {
    type: DataTypes.DATE,
    allowNull: true,
  });
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.removeColumn('packages', 'estimated_arrival_at');
  await queryInterface.removeColumn('packages', 'eta_seconds');
}
