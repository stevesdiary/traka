import { QueryInterface } from 'sequelize';

export const up = async (queryInterface: QueryInterface): Promise<void> => {
  const tableDesc = await queryInterface.describeTable('refresh_tokens');
  if ('refresh_token_hash' in tableDesc) {
    await queryInterface.renameColumn('refresh_tokens', 'refresh_token_hash', 'token_hash');
  }
};

export const down = async (queryInterface: QueryInterface): Promise<void> => {
  const tableDesc = await queryInterface.describeTable('refresh_tokens');
  if ('token_hash' in tableDesc) {
    await queryInterface.renameColumn('refresh_tokens', 'token_hash', 'refresh_token_hash');
  }
};
