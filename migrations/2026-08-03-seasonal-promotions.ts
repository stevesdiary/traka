import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.addColumn('promotions', 'applies_to', {
    type: DataTypes.ENUM('DELIVERY_FEE', 'TOTAL'),
    defaultValue: 'DELIVERY_FEE',
    allowNull: false
  });

  await queryInterface.addColumn('promotions', 'target_audience', {
    type: DataTypes.ENUM('ALL', 'CUSTOMERS', 'RIDERS'),
    defaultValue: 'ALL',
    allowNull: false
  });

  await queryInterface.addColumn('promotions', 'season', {
    type: DataTypes.STRING,
    allowNull: true
  });

  await queryInterface.addColumn('promotions', 'min_amount', {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  });

  await queryInterface.addColumn('promotions', 'stackable', {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
  });

  await queryInterface.addColumn('packages', 'promo_code', {
    type: DataTypes.STRING,
    allowNull: true
  });

  await queryInterface.addColumn('packages', 'promo_discount_amount', {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  });

  await queryInterface.addIndex('packages', ['promo_code']);
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.removeIndex('packages', ['promo_code']);
  await queryInterface.removeColumn('packages', 'promo_discount_amount');
  await queryInterface.removeColumn('packages', 'promo_code');
  await queryInterface.removeColumn('promotions', 'stackable');
  await queryInterface.removeColumn('promotions', 'min_amount');
  await queryInterface.removeColumn('promotions', 'season');
  await queryInterface.removeColumn('promotions', 'target_audience');
  await queryInterface.removeColumn('promotions', 'applies_to');
}
