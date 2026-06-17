import { sequelize } from '../config/database.js';
import { Transaction } from 'sequelize';
import { WalletRepository } from './wallet.repository.js';
import { PaymentProvider } from './payment-gateway.types.js';

export class WalletService {
  private walletRepository = new WalletRepository();
  private readonly COMMISSION_RATE = Number(process.env.RIDER_COMMISSION_RATE) || 0.20;
  private readonly CREDIT_LIMIT = Number(process.env.RIDER_CREDIT_LIMIT) || -2000.00;

  async createWallet(userId: string): Promise<any> {
    return await this.walletRepository.createWallet({
      user_id: userId,
      balance: 0.00,
      credit_limit: this.CREDIT_LIMIT
    });
  }

  async getWallet(userId: string): Promise<any> {
    return await this.walletRepository.findByUserId(userId);
  }

  // outerTx allows the caller to wrap this operation in a larger atomic transaction.
  // When provided, commit/rollback are the caller's responsibility.
  async processCashDelivery(riderId: string, totalFare: number, packageId: string, outerTx?: Transaction): Promise<void> {
    const managed = !outerTx;
    const t = outerTx ?? await sequelize.transaction();

    try {
      const reference = `COMM-${packageId}`;
      const existingTx = await this.walletRepository.findTransactionByReference(reference, t);
      if (existingTx) {
        if (managed) await t.rollback();
        return;
      }

      const wallet = await this.walletRepository.findByUserId(riderId, t);
      if (!wallet) throw new Error('Wallet not found');

      const commission = totalFare * this.COMMISSION_RATE;

      await this.walletRepository.updateBalance(wallet.id, -commission, t);
      await this.walletRepository.createTransaction({
        wallet_id: wallet.id,
        amount: -commission,
        type: 'COMMISSION_DEBIT',
        reference,
        description: `Commission for package ${packageId}`,
        package_id: packageId
      }, t);

      // Compute new balance arithmetically — avoids a stale out-of-transaction read.
      const newBalance = Number(wallet.balance) - commission;
      if (newBalance <= this.CREDIT_LIMIT) {
        await this.walletRepository.updateStatus(wallet.id, false, t);
      }

      if (managed) await t.commit();
    } catch (error) {
      if (managed) await t.rollback();
      throw error;
    }
  }

  async processPayment(riderId: string, amountPaid: number, transactionReference: string): Promise<void> {
    const t = await sequelize.transaction();

    try {
      // Check duplicate
      const existingTx = await this.walletRepository.findTransactionByReference(transactionReference, t);
      if (existingTx) {
        await t.rollback();
        return;
      }

      const wallet = await this.walletRepository.findByUserId(riderId, t);
      if (!wallet) throw new Error('Wallet not found');

      const commission = amountPaid * this.COMMISSION_RATE;
      const netEarnings = amountPaid - commission;

      await this.walletRepository.updateBalance(wallet.id, netEarnings, t);
      await this.walletRepository.createTransaction({
        wallet_id: wallet.id,
        amount: netEarnings,
        type: 'TRIP_EARNING',
        reference: transactionReference,
        description: `Payment: ₦${amountPaid} (Net: ₦${netEarnings})`
      }, t);

      const newBalance = Number(wallet.balance) + netEarnings;
      if (newBalance > this.CREDIT_LIMIT && !wallet.is_active) {
        await this.walletRepository.updateStatus(wallet.id, true, t);
      }

      await t.commit();
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  async processWalletDeposit(
    userId: string,
    amount: number,
    transactionReference: string,
    provider: PaymentProvider
  ): Promise<void> {
    const t = await sequelize.transaction();

    try {
      if (amount <= 0) {
        throw new Error('Deposit amount must be greater than zero');
      }

      const existingTx = await this.walletRepository.findTransactionByReference(transactionReference, t);
      if (existingTx) {
        await t.rollback();
        return;
      }

      const wallet = await this.walletRepository.findByUserId(userId, t);
      if (!wallet) throw new Error('Wallet not found');

      await this.walletRepository.updateBalance(wallet.id, amount, t);
      await this.walletRepository.createTransaction({
        wallet_id: wallet.id,
        amount,
        type: 'DEPOSIT',
        reference: transactionReference,
        description: `Wallet funding via ${provider}: ₦${amount.toFixed(2)}`
      }, t);

      const newBalance = Number(wallet.balance) + amount;
      if (newBalance > this.CREDIT_LIMIT && !wallet.is_active) {
        await this.walletRepository.updateStatus(wallet.id, true, t);
      }

      await t.commit();
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  async getTransactionHistory(userId: string, limit = 50): Promise<any[]> {
    const wallet = await this.getWallet(userId);
    if (!wallet) return [];

    return await this.walletRepository.getTransactionHistory(wallet.id, limit);
  }

  async getWalletBalance(userId: string): Promise<number> {
    const wallet = await this.getWallet(userId);
    return wallet ? Number(wallet.balance) : 0;
  }
}
