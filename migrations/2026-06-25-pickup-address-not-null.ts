import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  // Backfill any existing nulls before adding NOT NULL constraint
  await queryInterface.sequelize.query(`
    UPDATE packages SET pickup_address = delivery_address
    WHERE pickup_address IS NULL AND delivery_address IS NOT NULL
  `);
  await queryInterface.sequelize.query(`
    UPDATE packages SET pickup_address = 'Unknown pickup address'
    WHERE pickup_address IS NULL
  `);

  await queryInterface.changeColumn('packages', 'pickup_address', {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: '',
  });
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.changeColumn('packages', 'pickup_address', {
    type: DataTypes.STRING,
    allowNull: true,
  });
}
