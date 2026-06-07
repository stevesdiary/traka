import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.createTable('webhook_subscriptions', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
    },
    tenant_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'tenants', key: 'id' },
    },
    url: {
      type: DataTypes.STRING(2048),
      allowNull: false,
    },
    secret: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    events: {
      type: DataTypes.JSONB,
      defaultValue: [],
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('ACTIVE', 'DISABLED'),
      defaultValue: 'ACTIVE',
      allowNull: false,
    },
    last_delivery_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    failure_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  });
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.dropTable('webhook_subscriptions');
}
