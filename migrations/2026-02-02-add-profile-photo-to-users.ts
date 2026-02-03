import { DataTypes, QueryInterface } from 'sequelize';

export const up = async (queryInterface: QueryInterface) => {
  await queryInterface.addColumn('users', 'profile_photo', {
    type: DataTypes.STRING,
    allowNull: true
  });
};

export const down = async (queryInterface: QueryInterface) => {
  await queryInterface.removeColumn('users', 'profile_photo');
};
