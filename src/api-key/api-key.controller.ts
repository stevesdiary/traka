import { Request, Response } from 'express';
import { ApiKeyService } from './api-key.service.js';
import { BusinessMemberModel } from '../business/business-member.model.js';
import config from '../config/environment.js';

const apiKeyService = new ApiKeyService();

async function assertMembership(userId: string, tenantId: string, res: Response): Promise<boolean> {
  const membership = await BusinessMemberModel.findOne({
    where: { user_id: userId, tenant_id: tenantId, status: 'ACTIVE' },
  });
  if (!membership || membership.role === 'MEMBER') {
    res.status(403).json({ error: 'Only business owners and admins can manage API keys' });
    return false;
  }
  return true;
}

export const createApiKey = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { business_id } = req.params as Record<string, string>;
    const { name } = req.body;

    if (!name || typeof name !== 'string') {
      res.status(400).json({ error: 'name is required' });
      return;
    }

    if (!(await assertMembership(userId, business_id, res))) return;

    const result = await apiKeyService.generateKey(business_id, name, userId);
    res.status(201).json({
      message: 'API key created. Store the raw_key securely — it will not be shown again.',
      api_key: result,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create API key', ...(config.isDevelopment && { details: error.message }) });
  }
};

export const listApiKeys = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { business_id } = req.params as Record<string, string>;

    if (!(await assertMembership(userId, business_id, res))) return;

    const keys = await apiKeyService.listKeys(business_id);
    res.json({ api_keys: keys });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to list API keys', ...(config.isDevelopment && { details: error.message }) });
  }
};

export const revokeApiKey = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { business_id, key_id } = req.params as Record<string, string>;

    if (!(await assertMembership(userId, business_id, res))) return;

    await apiKeyService.revokeKey(key_id, business_id);
    res.json({ message: 'API key revoked successfully' });
  } catch (error: any) {
    if (error.message === 'API key not found') {
      res.status(404).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: 'Failed to revoke API key', ...(config.isDevelopment && { details: error.message }) });
  }
};
