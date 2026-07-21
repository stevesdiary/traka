import { QueryInterface } from 'sequelize';

export const up = async (queryInterface: QueryInterface): Promise<void> => {
  await queryInterface.renameColumn('refresh_tokens', 'refresh_token_hash', 'token_hash');
};

export const down = async (queryInterface: QueryInterface): Promise<void> => {
  await queryInterface.renameColumn('refresh_tokens', 'token_hash', 'refresh_token_hash');
};
