import { PackageModel } from '../package/package.model.js';
import { WalletService } from '../wallet/wallet.service.js';
import logger from '../utils/logger.js';

export class CashPaymentService {
  private walletService: WalletService;

  constructor() {
    this.walletService = new WalletService();
  }

  /**
   * Confirm cash payment collected by rider
   * @param package_id - Package ID
   * @param rider_id - Rider who collected cash
   * @param amount_collected - Amount collected from payer
   */
  async confirmCashPayment(
    package_id: string,
    rider_id: string,
    amount_collected: number
  ): Promise<any> {
    const packageData = await PackageModel.findByPk(package_id);
    
    if (!packageData) {
      throw new Error('Package not found');
    }

    if (packageData.payment_method !== 'CASH') {
      throw new Error('Package is not a cash payment');
    }

    if (packageData.payment_status === 'PAID') {
      throw new Error('Payment already confirmed');
    }

    // Verify amount matches
    const expectedAmount = Number(packageData.total_amount);
    if (amount_collected !== expectedAmount) {
      logger.warn('Cash payment amount mismatch', {
        package_id,
        expected: expectedAmount,
        collected: amount_collected
      });
    }

    // Update package payment status
    await packageData.update({
      payment_status: 'PAID',
      paid_at: new Date()
    });

    // Deduct cash from rider's wallet (creates debt)
    await this.walletService.processCashDelivery(
      rider_id,
      expectedAmount,
      package_id
    );

    logger.info('Cash payment confirmed', {
      package_id,
      rider_id,
      amount: expectedAmount,
      payment_by: packageData.payment_by
    });

    return {
      message: 'Cash payment confirmed',
      amount_collected: expectedAmount,
      payment_by: packageData.payment_by,
      rider_debt_created: true
    };
  }

  /**
   * Get cash payment summary for a rider
   */
  async getCashPaymentSummary(rider_id: string): Promise<any> {
    const walletBalance = await this.walletService.getWalletBalance(rider_id);
    
    return {
      rider_id,
      current_balance: walletBalance,
      cash_debt: walletBalance < 0 ? Math.abs(walletBalance) : 0
    };
  }
}

export const cashPaymentService = new CashPaymentService();
