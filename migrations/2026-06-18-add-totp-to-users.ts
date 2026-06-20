import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.addColumn('users', 'totp_secret_enc', {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: null
  });

  await queryInterface.addColumn('users', 'totp_enabled', {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  });
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.removeColumn('users', 'totp_secret_enc');
  await queryInterface.removeColumn('users', 'totp_enabled');
}
