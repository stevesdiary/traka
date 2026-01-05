import { LegalRepository } from './legal.repository.js';

export class LegalService {
  private legalRepository = new LegalRepository();

  async getFAQs(): Promise<any[]> {
    return await this.legalRepository.findByType('FAQ');
  }

  async getTermsOfService(): Promise<any> {
    return await this.legalRepository.findLatestByType('TERMS_OF_SERVICE');
  }

  async getCommissionPolicy(): Promise<any> {
    return await this.legalRepository.findLatestByType('COMMISSION_POLICY');
  }

  async seedLegalContent(): Promise<void> {
    const existingContent = await this.legalRepository.count();
    if (existingContent > 0) return;

    const legalContent = [
      // FAQ - General
      {
        type: 'FAQ',
        category: 'General',
        title: 'What is TRAKA?',
        content: 'TRAKA is a comprehensive logistics and package tracking platform that connects businesses, riders, and recipients for efficient delivery services.',
        order_index: 1
      },
      {
        type: 'FAQ',
        category: 'General',
        title: 'How do I track my package?',
        content: 'You can track your package using the tracking number provided. Enter it on our tracking page or use the mobile app for real-time updates.',
        order_index: 2
      },
      
      // FAQ - Riders
      {
        type: 'FAQ',
        category: 'Riders',
        title: 'How do rider commissions work?',
        content: 'TRAKA deducts a 20% service fee from every completed delivery. For digital payments, you receive 80% in your wallet. For cash collections, the 20% commission creates a debt in your wallet.',
        order_index: 1
      },
      {
        type: 'FAQ',
        category: 'Riders',
        title: 'What is the wallet credit limit?',
        content: 'Every rider has a ₦2,000 credit limit. If your negative balance exceeds this limit, your account will be suspended until repayment is made.',
        order_index: 2
      },
      {
        type: 'FAQ',
        category: 'Riders',
        title: 'How are negative balances cleared?',
        content: 'Negative balances are automatically cleared using earnings from your future digital payment orders. You can also make manual payments to clear debt faster.',
        order_index: 3
      },

      // FAQ - Businesses
      {
        type: 'FAQ',
        category: 'Businesses',
        title: 'How does business billing work?',
        content: 'Businesses maintain a prepaid wallet balance. Platform fees (15%) are deducted in real-time per delivery. Auto-recharge triggers when balance drops below threshold.',
        order_index: 1
      },
      {
        type: 'FAQ',
        category: 'Businesses',
        title: 'How do I get verified as a business?',
        content: 'After registration, submit your business documents for admin review. Verification typically takes 1-3 business days.',
        order_index: 2
      },

      // Terms of Service
      {
        type: 'TERMS_OF_SERVICE',
        title: 'TRAKA Terms of Service',
        content: `
# TRAKA TERMS OF SERVICE

## 1. ACCEPTANCE OF TERMS
By using TRAKA services, you agree to these Terms of Service and all applicable laws and regulations.

## 2. COMMISSION & WALLET SETTLEMENT POLICY

### Commission Rate
The Platform shall deduct a 20% service fee from the total fare of every completed delivery.

### Payment Collection
- **For Card/Digital Payments**: The Platform collects the fare and credits the Rider's wallet with the Net Fare (Total Fare minus Commission).
- **For Cash or Direct Transfers to Rider**: The Rider is responsible for collecting the full fare. The Platform's Commission will be recorded as a debit (negative balance) in the Rider's wallet.

### Credit Limit
Every Rider has a "Credit Limit" of ₦2,000. If a Rider's negative balance exceeds this limit, the account will be automatically suspended from receiving new orders until a repayment is made.

### Settlement
Negative balances are automatically cleared by the Platform using earnings from the Rider's future digital payment orders.

## 3. BUSINESS BILLING
Businesses maintain a prepaid wallet balance. Platform fees are deducted in real-time per delivery with auto-recharge when balance is low.

## 4. USER RESPONSIBILITIES
- Provide accurate information
- Comply with all applicable laws
- Maintain account security
- Report issues promptly

## 5. LIMITATION OF LIABILITY
TRAKA's liability is limited to the value of the service provided. We are not liable for indirect or consequential damages.

## 6. TERMINATION
Either party may terminate this agreement with 30 days notice. Immediate termination may occur for violations of these terms.

## 7. GOVERNING LAW
These terms are governed by the laws of Nigeria.

Last updated: ${new Date().toISOString().split('T')[0]}
        `,
        order_index: 1,
        content_version: '1.0.0'
      },

      // Commission Policy
      {
        type: 'COMMISSION_POLICY',
        title: 'TRAKA Commission & Wallet Policy',
        content: `
# COMMISSION & WALLET SETTLEMENT POLICY

## Commission Structure
- **Rider Commission**: 20% service fee deducted from total delivery fare
- **Business Platform Fee**: 15% fee on monthly delivered packages

## Payment Methods

### Digital Payments (Card/Bank Transfer)
1. Customer pays through platform
2. Platform deducts 20% commission
3. Rider receives 80% net fare in wallet
4. Instant settlement

### Cash/Direct Payments
1. Rider collects full fare from customer
2. Platform records 20% commission as wallet debt
3. Debt automatically cleared from future digital earnings
4. Manual payments accepted to clear debt

## Wallet Management

### Credit Limit
- Maximum debt allowed: ₦2,000
- Account suspension if limit exceeded
- Automatic reactivation when balance improves

### Debt Settlement
- Automatic clearing from future earnings
- Manual payment options available
- Real-time balance tracking
- Complete transaction history

## Business Billing
- Prepaid credit system
- 15% platform fee deducted per delivery
- Auto-recharge when balance low
- Real-time fee deduction

## Dispute Resolution
Contact support within 48 hours of any transaction disputes.

Effective Date: ${new Date().toISOString().split('T')[0]}
        `,
        order_index: 1,
        content_version: '1.0.0'
      }
    ];

    await this.legalRepository.bulkCreate(legalContent);
  }
}