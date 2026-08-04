import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.addColumn('service_areas', 'latitude', {
    type: DataTypes.DECIMAL(10, 7),
    allowNull: true,
  });

  await queryInterface.addColumn('service_areas', 'longitude', {
    type: DataTypes.DECIMAL(10, 7),
    allowNull: true,
  });

  await queryInterface.addColumn('service_areas', 'radius_km', {
    type: DataTypes.DECIMAL(8, 2),
    allowNull: true,
  });
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.removeColumn('service_areas', 'radius_km');
  await queryInterface.removeColumn('service_areas', 'longitude');
  await queryInterface.removeColumn('service_areas', 'latitude');
}
