import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.createTable('packages', {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
    },
    tracking_number: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    sender_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
    },
    recipient_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'users', key: 'id' },
    },
    recipient_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    recipient_email: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    recipient_phone: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('PENDING', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'),
      defaultValue: 'PENDING',
      allowNull: false,
    },
    schedule_type: {
      type: DataTypes.ENUM('IMMEDIATE', 'SCHEDULED', 'SAME_DAY', 'NEXT_DAY'),
      defaultValue: 'IMMEDIATE',
      allowNull: false,
    },
    scheduled_for: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    pickup_address: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    delivery_address: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    tenant_id: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    delivered_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    delivery_notes: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    package_size: {
      type: DataTypes.ENUM('SMALL', 'MEDIUM', 'LARGE'),
      defaultValue: 'SMALL',
      allowNull: false,
    },
    package_weight: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
    },
    delivery_speed: {
      type: DataTypes.ENUM('STANDARD', 'EXPRESS', 'SAME_DAY'),
      defaultValue: 'STANDARD',
      allowNull: false,
    },
    delivery_fee: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    platform_fee: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    total_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    estimated_distance_km: {
      type: DataTypes.DECIMAL(8, 2),
      allowNull: true,
    },
    payment_method: {
      type: DataTypes.ENUM('DIGITAL', 'CASH'),
      defaultValue: 'DIGITAL',
      allowNull: false,
    },
    payment_by: {
      type: DataTypes.ENUM('SENDER', 'RECIPIENT'),
      defaultValue: 'SENDER',
      allowNull: false,
    },
    payment_status: {
      type: DataTypes.ENUM('PENDING', 'PAID', 'FAILED'),
      defaultValue: 'PENDING',
      allowNull: false,
    },
    paid_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    category: {
      type: DataTypes.ENUM(
        'FOOD',
        'SHOES',
        'ELECTRONICS',
        'CLOTHING',
        'JEWELRY_VALUABLES',
        'GROCERIES',
        'DOCUMENTS',
        'HEALTH_PHARMACEUTICALS',
        'CONSTRUCTION_MATERIALS',
        'HOUSEHOLD_ITEMS',
        'OTHERS',
      ),
      allowNull: false,
      defaultValue: 'OTHERS',
    },
    is_fragile: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
    pickup_pin: {
      type: DataTypes.STRING(6),
      allowNull: true,
    },
    delivery_pin: {
      type: DataTypes.STRING(6),
      allowNull: true,
    },
    qr_code_data: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    pickup_confirmed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
    delivery_confirmed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
    pickup_confirmed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    delivery_confirmed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    cancellation_reason: {
      type: DataTypes.ENUM(
        'PILOT_ASKED_TO_CANCEL',
        'LONG_PICKUP_TIME',
        'WRONG_ORDER_DETAILS',
        'RIDER_ASKING_DIFFERENT_MONEY',
        'RIDER_UNTIDY_NO_UNIFORM',
        'FOUND_ALTERNATIVE',
        'PACKAGE_HEAVIER_THAN_CAPACITY',
        'OTHER',
      ),
      allowNull: true,
    },
    cancellation_note: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    cancelled_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    cancelled_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'users', key: 'id' },
    },
    rider_has_package: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    guest_tracking_token: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    rider_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'users', key: 'id' },
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  });
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.dropTable('packages');
}
