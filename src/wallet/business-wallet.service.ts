import { sequelize } from '../config/database.js';
import { BusinessWalletRepository } from './business-wallet.repository.js';
import logger from '../utils/logger.js';

export class BusinessWalletService {
  private businessWalletRepository = new BusinessWalletRepository();
  private readonly PLATFORM_FEE_RATE = Number(process.env.PLATFORM_FEE_RATE_BUSINESS) || 0.15;

  async createBusinessWallet(tenantId: string): Promise<any> {
    return await this.businessWalletRepository.createWallet({
      tenant_id: tenantId,
      balance: 0.00,
      auto_recharge_threshold: 1000.00,
      auto_recharge_amount: 5000.00
    });
  }

  async getBusinessWallet(tenantId: string): Promise<any> {
    return await this.businessWalletRepository.findByTenantId(tenantId);
  }

  async deductPlatformFee(tenantId: string, deliveryFee: number, packageId: string): Promise<boolean> {
    const t = await sequelize.transaction();

    try {
      const wallet = await this.businessWalletRepository.findByTenantId(tenantId);

      if (!wallet) {
        throw new Error('Business wallet not found');
      }

      const platformFee = deliveryFee * this.PLATFORM_FEE_RATE;

      // Check sufficient balance
      if (wallet.balance < platformFee) {
        await t.rollback();
        return false; // Insufficient funds
      }

      // Deduct platform fee
      await this.businessWalletRepository.updateBalance(wallet.id, -platformFee, t);

      // Log transaction
      await this.businessWalletRepository.createTransaction({
        wallet_id: wallet.id,
        amount: -platformFee,
        type: 'PLATFORM_FEE',
        reference: `FEE-${packageId}`,
        description: `Platform fee for package ${packageId}`,
        package_id: packageId
      }, t);

      // Check if auto-recharge needed
      const updatedWallet = await this.businessWalletRepository.findByTenantId(tenantId);
      if (updatedWallet && 
          updatedWallet.auto_recharge_enabled && 
          updatedWallet.balance <= updatedWallet.auto_recharge_threshold) {
        logger.info('Auto-recharge triggered', { tenantId });
      }

      await t.commit();
      return true;
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  async rechargeWallet(tenantId: string, amount: number, reference: string): Promise<void> {
    const t = await sequelize.transaction();

    try {
      // Check duplicate
      const existingTx = await this.businessWalletRepository.findTransactionByReference(reference, t);
      if (existingTx) {
        await t.rollback();
        return;
      }

      const wallet = await this.businessWalletRepository.findByTenantId(tenantId);
      if (!wallet) {
        throw new Error('Business wallet not found');
      }

      // Credit wallet
      await this.businessWalletRepository.updateBalance(wallet.id, amount, t);

      // Log transaction
      await this.businessWalletRepository.createTransaction({
        wallet_id: wallet.id,
        amount: amount,
        type: 'RECHARGE',
        reference: reference,
        description: `Wallet recharge: ₦${amount}`
      }, t);

      await t.commit();
    } catch (error) {
      await t.rollback();
      throw error;
    }
  }

  async getWalletBalance(tenantId: string): Promise<number> {
    const wallet = await this.getBusinessWallet(tenantId);
    return wallet ? Number(wallet.balance) : 0;
  }
}