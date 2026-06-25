import { QueryInterface } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.sequelize.query(
    `ALTER TYPE "enum_wallet_transactions_type" ADD VALUE IF NOT EXISTS 'DELIVERY_PAYMENT'`
  );
}

export async function down(_queryInterface: QueryInterface): Promise<void> {
  // PostgreSQL does not support removing enum values — no-op on rollback
}
