import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.addColumn('packages', 'category', {
    type: DataTypes.ENUM(
      'DOCUMENTS',
      'FOOD',
      'SHOES',
      'ELECTRONICS',
      'CLOTHING',
      'JEWELRY_ACCESSORIES',
      'GROCERIES',
      'PHONES',
      'HEALTH_PHARMACEUTICALS',
      'CONSTRUCTION_MATERIALS',
      'HOUSEHOLD_ITEMS',
      'FROZEN_FOODS',
      'COMPUTER_ACCESSORIES',
      'OTHERS'
    ),
    allowNull: false,
    defaultValue: 'OTHERS',
  });

  await queryInterface.addColumn('packages', 'is_fragile', {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  });

  await queryInterface.addColumn('packages', 'rider_has_package', {
    type: DataTypes.BOOLEAN,
    allowNull: true,
  });

  await queryInterface.addIndex('packages', ['category'], {
    name: 'idx_packages_category',
  });
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.removeIndex('packages', 'idx_packages_category');
  await queryInterface.removeColumn('packages', 'rider_has_package');
  await queryInterface.removeColumn('packages', 'is_fragile');
  await queryInterface.removeColumn('packages', 'category');
}
