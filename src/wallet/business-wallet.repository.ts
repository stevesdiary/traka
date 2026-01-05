import { BusinessWalletModel, BusinessWalletTransactionModel } from './business-wallet.model.js';
import { Transaction } from 'sequelize';

export class BusinessWalletRepository {
  async createWallet(data: {
    tenant_id: string;
    balance?: number;
    auto_recharge_threshold?: number;
    auto_recharge_amount?: number;
  }): Promise<BusinessWalletModel> {
    return await BusinessWalletModel.create(data);
  }

  async findByTenantId(tenantId: string): Promise<BusinessWalletModel | null> {
    return await BusinessWalletModel.findOne({
      where: { tenant_id: tenantId }
    });
  }

  async updateBalance(walletId: string, amount: number, transaction?: Transaction): Promise<void> {
    const wallet = await BusinessWalletModel.findByPk(walletId, { transaction });
    if (wallet) {
      if (amount > 0) {
        await wallet.increment('balance', { by: amount, transaction });
      } else {
        await wallet.decrement('balance', { by: Math.abs(amount), transaction });
      }
    }
  }

  async createTransaction(data: {
    wallet_id: string;
    amount: number;
    type: string;
    reference: string;
    description?: string;
    package_id?: string;
  }, transaction?: Transaction): Promise<BusinessWalletTransactionModel> {
    return await BusinessWalletTransactionModel.create(data, { transaction });
  }

  async findTransactionByReference(reference: string, transaction?: Transaction): Promise<BusinessWalletTransactionModel | null> {
    return await BusinessWalletTransactionModel.findOne({
      where: { reference },
      transaction
    });
  }
}