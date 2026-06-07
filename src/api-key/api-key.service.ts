import crypto from 'crypto';
import { Op } from 'sequelize';
import { ApiKeyModel } from './api-key.model.js';

export class ApiKeyService {
  async generateKey(tenantId: string, name: string, createdBy: string) {
    const rawKey = `sk_live_${crypto.randomBytes(32).toString('base64url')}`;
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const keyPrefix = rawKey.substring(0, 12);

    const apiKey = await ApiKeyModel.create({
      tenant_id: tenantId,
      name,
      key_prefix: keyPrefix,
      key_hash: keyHash,
      status: 'ACTIVE',
      created_by: createdBy,
    });

    return { ...apiKey.toJSON(), raw_key: rawKey };
  }

  async validateKey(rawKey: string): Promise<ApiKeyModel | null> {
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const apiKey = await ApiKeyModel.findOne({
      where: {
        key_hash: keyHash,
        status: 'ACTIVE',
        [Op.or]: [{ expires_at: null }, { expires_at: { [Op.gt]: new Date() } }],
      },
    });
    return apiKey;
  }

  async updateLastUsed(keyId: string): Promise<void> {
    await ApiKeyModel.update({ last_used_at: new Date() }, { where: { id: keyId } });
  }

  async revokeKey(keyId: string, tenantId: string): Promise<void> {
    const [affected] = await ApiKeyModel.update(
      { status: 'REVOKED' },
      { where: { id: keyId, tenant_id: tenantId } }
    );
    if (affected === 0) throw new Error('API key not found');
  }

  async listKeys(tenantId: string) {
    return ApiKeyModel.findAll({
      where: { tenant_id: tenantId },
      attributes: { exclude: ['key_hash'] },
      order: [['createdAt', 'DESC']],
    });
  }
}
