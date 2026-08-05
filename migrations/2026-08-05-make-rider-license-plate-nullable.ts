import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.changeColumn('riders', 'license_number', {
    type: DataTypes.STRING,
    allowNull: true
  });
  await queryInterface.changeColumn('riders', 'vehicle_plate', {
    type: DataTypes.STRING,
    allowNull: true
  });
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.changeColumn('riders', 'license_number', {
    type: DataTypes.STRING,
    allowNull: false
  });
  await queryInterface.changeColumn('riders', 'vehicle_plate', {
    type: DataTypes.STRING,
    allowNull: false
  });
}
