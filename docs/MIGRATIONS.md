# Database Migration System

## Overview
Using **Umzug** for TypeScript-native migrations with Sequelize storage.

## Commands

```bash
# Run pending migrations
npm run migrate:up

# Rollback last migration
npm run migrate:down

# Check pending migrations
npm run migrate:pending

# Check executed migrations
npm run migrate:executed
```

## Creating Migrations

### File Naming Convention
`YYYY-MM-DD-description.ts` (e.g., `2024-01-15-add-user-fields.ts`)

### Migration Template
```typescript
import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  // Add your schema changes here
  await queryInterface.addColumn('table_name', 'column_name', {
    type: DataTypes.STRING,
    allowNull: false,
  });
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  // Reverse the changes
  await queryInterface.removeColumn('table_name', 'column_name');
}
```

## Best Practices

### Development
1. **Test migrations locally first**
   ```bash
   npm run migrate:up
   npm run migrate:down  # Test rollback
   npm run migrate:up    # Re-apply
   ```

2. **Always write `down()` migrations**
   - Enables safe rollbacks
   - Critical for production

3. **One logical change per migration**
   - Easier to debug
   - Safer rollbacks

### Production Deployment

1. **Pre-deployment checklist:**
   - [ ] Test migration on staging database
   - [ ] Backup production database
   - [ ] Check pending migrations: `npm run migrate:pending`
   - [ ] Review migration code

2. **Deployment steps:**
   ```bash
   # 1. Pull latest code
   git pull origin main
   
   # 2. Install dependencies
   pnpm install
   
   # 3. Run migrations
   npm run migrate:up
   
   # 4. Start application
   npm start
   ```

3. **Rollback procedure (if needed):**
   ```bash
   npm run migrate:down
   ```

### Migration Safety Rules

✅ **DO:**
- Add new columns with defaults
- Add new tables
- Add indexes
- Add constraints (with validation disabled initially)

⚠️ **CAREFUL:**
- Renaming columns (use add + copy + remove)
- Changing column types (may lose data)
- Removing columns (ensure code doesn't use them first)

❌ **DON'T:**
- Remove columns with data without backup
- Change primary keys
- Modify migrations after they're deployed

## Environment-Specific Migrations

### Development
- Migrations run automatically on `npm start`
- Safe to experiment and rollback

### Production
- Migrations run manually before deployment
- Always backup first
- Test on staging environment

## Migration Storage

Migrations are tracked in the `SequelizeMeta` table:
- `name`: Migration filename
- `createdAt`: When it was executed

## Troubleshooting

### Migration failed mid-execution
```bash
# Check which migrations ran
npm run migrate:executed

# Manually fix database if needed
# Then mark migration as executed or rollback
```

### Need to skip a migration
```sql
-- Manually insert into SequelizeMeta
INSERT INTO "SequelizeMeta" (name) VALUES ('2024-01-15-migration-name.ts');
```

### Reset all migrations (DEVELOPMENT ONLY)
```sql
TRUNCATE TABLE "SequelizeMeta";
```

## Example Migrations

See `migrations/2024-01-01-add-package-fields.ts` for reference.
