import { WalletModel, WalletTransactionModel } from './wallet.model.js';
import { Transaction } from 'sequelize';

export class WalletRepository {
  async createWallet(data: {
    user_id: string;
    balance?: number;
    credit_limit?: number;
  }): Promise<WalletModel> {
    return await WalletModel.create(data);
  }

  async findByUserId(userId: string, transaction?: Transaction): Promise<WalletModel | null> {
    return await WalletModel.findOne({
      where: { user_id: userId },
      transaction
    });
  }

  async updateBalance(walletId: string, amount: number, transaction?: Transaction): Promise<void> {
    const wallet = await WalletModel.findByPk(walletId, { transaction });
    if (wallet) {
      if (amount > 0) {
        await wallet.increment('balance', { by: amount, transaction });
      } else {
        await wallet.decrement('balance', { by: Math.abs(amount), transaction });
      }
    }
  }

  async updateStatus(walletId: string, isActive: boolean, transaction?: Transaction): Promise<void> {
    await WalletModel.update(
      { is_active: isActive },
      { where: { id: walletId }, transaction }
    );
  }

  async createTransaction(data: {
    wallet_id: string;
    amount: number;
    type: string;
    reference: string;
    description?: string;
    package_id?: string;
  }, transaction?: Transaction): Promise<WalletTransactionModel> {
    return await WalletTransactionModel.create(data, { transaction });
  }

  async findTransactionByReference(reference: string, transaction?: Transaction): Promise<WalletTransactionModel | null> {
    return await WalletTransactionModel.findOne({
      where: { reference },
      transaction
    });
  }

  async getTransactionHistory(walletId: string, limit = 50): Promise<WalletTransactionModel[]> {
    return await WalletTransactionModel.findAll({
      where: { wallet_id: walletId },
      order: [['createdAt', 'DESC']],
      limit
    });
  }

  async updateBankAccount(walletId: string, data: {
    bank_name: string;
    bank_code: string;
    account_number: string;
    account_name: string;
  }): Promise<void> {
    await WalletModel.update(data, { where: { id: walletId } });
  }
}