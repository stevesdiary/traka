import request from 'supertest';
import jwt from 'jsonwebtoken';
import express from 'express';
import cookieParser from 'cookie-parser';

const mockAuthService = {
  login: jest.fn(),
  registerCustomer: jest.fn(),
  registerBusiness: jest.fn(),
  registerRider: jest.fn(),
  register: jest.fn(),
  registerAdmin: jest.fn(),
  requestPasswordReset: jest.fn(),
  resetPassword: jest.fn(),
  updatePassword: jest.fn()
};

const mockUserRepository = {
  findById: jest.fn(),
  updateById: jest.fn()
};

const tokenServiceMocks = {
  setAuthCookie: jest.fn((res: any, token: string) => {
    res.cookie('traka_token', token);
  }),
  setRefreshCookie: jest.fn((res: any, token: string) => {
    res.cookie('traka_refresh', token);
  }),
  clearAuthCookies: jest.fn((res: any) => {
    res.clearCookie('traka_token');
    res.clearCookie('traka_refresh');
  }),
  issueRefreshToken: jest.fn(),
  revokeRefreshToken: jest.fn(),
  verifyRefreshToken: jest.fn(),
  revokeRefreshTokenRecord: jest.fn(),
  issueAccessToken: jest.fn()
};

const mockPaymentGatewayService = {
  initializeWalletFunding: jest.fn(),
  verifyWalletFunding: jest.fn(),
  handleWebhook: jest.fn()
};

jest.mock('../auth/auth.service.js', () => ({
  AuthService: jest.fn().mockImplementation(() => mockAuthService)
}));

jest.mock('../user/user.repository.js', () => ({
  UserRepository: jest.fn().mockImplementation(() => mockUserRepository)
}));

jest.mock('../auth/token.service.js', () => tokenServiceMocks);

jest.mock('../wallet/payment-gateway.service.js', () => ({
  PaymentGatewayService: jest.fn().mockImplementation(() => mockPaymentGatewayService)
}));

import authRoutes from '../auth/auth.routes.js';
import { walletRoutes } from '../wallet/wallet.routes.js';

describe('Critical API Flows (E2E)', () => {
  const app = express();
  app.use(express.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = Buffer.from(buf);
    }
  }));
  app.use(cookieParser());
  app.use('/api/auth', authRoutes);
  app.use('/api/wallet', walletRoutes);

  const jwtSecret = process.env.JWT_SECRET || 'test-secret-key';
  const accessToken = jwt.sign(
    {
      id: 'user-123',
      userId: 'user-123',
      email: 'user@test.com',
      role: 'USER',
      type: 'USER',
      tenant_id: null
    },
    jwtSecret,
    { expiresIn: '1h' }
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Auth lifecycle', () => {
    it('logs in, sets auth cookies, and returns access token', async () => {
      mockAuthService.login.mockResolvedValue({
        token: 'access-token-1',
        user: { id: 'user-123' }
      });
      tokenServiceMocks.issueRefreshToken.mockResolvedValue('refresh-token-1');

      const response = await request(app).post('/api/auth/login').send({
        email: 'user@test.com',
        password: 'Password123!'
      });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        message: 'Login successful',
        token: 'access-token-1'
      });
      expect(response.headers['set-cookie']).toEqual(
        expect.arrayContaining([
          expect.stringContaining('traka_token=access-token-1'),
          expect.stringContaining('traka_refresh=refresh-token-1')
        ])
      );
    });

    it('fetches current profile with valid bearer token', async () => {
      mockUserRepository.findById.mockResolvedValue({
        id: 'user-123',
        email: 'user@test.com',
        role: 'USER',
        type: 'USER',
        tenant_id: null,
        first_name: 'Test',
        surname: 'User',
        phone: '+2348000000000',
        email_verified: true,
        phone_verified: false,
        profile_photo: null
      });

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.user).toMatchObject({
        id: 'user-123',
        email: 'user@test.com',
        role: 'USER',
        first_name: 'Test'
      });
    });

    it('refreshes tokens from refresh cookie', async () => {
      tokenServiceMocks.verifyRefreshToken.mockResolvedValue({
        payload: { userId: 'user-123' },
        record: { id: 'refresh-record-1' }
      });
      mockUserRepository.findById.mockResolvedValue({
        id: 'user-123',
        email: 'user@test.com',
        role: 'USER',
        type: 'USER',
        tenant_id: null
      });
      tokenServiceMocks.issueAccessToken.mockReturnValue('new-access-token');
      tokenServiceMocks.issueRefreshToken.mockResolvedValue('new-refresh-token');

      const response = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', ['traka_refresh=old-refresh-token']);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        message: 'Token refreshed',
        token: 'new-access-token'
      });
      expect(response.headers['set-cookie']).toEqual(
        expect.arrayContaining([
          expect.stringContaining('traka_token=new-access-token'),
          expect.stringContaining('traka_refresh=new-refresh-token')
        ])
      );
    });
  });

  describe('Wallet funding lifecycle', () => {
    it('initializes funding through payment gateway for authenticated user', async () => {
      mockPaymentGatewayService.initializeWalletFunding.mockResolvedValue({
        provider: 'KUDA',
        reference: 'WLT-KUDA-123',
        bankDetails: {
          accountNumber: '2000000001',
          accountName: 'TRAKA',
          bankName: 'Kuda Microfinance Bank',
          bankCode: '090267'
        },
        accessCode: undefined
      });

      const response = await request(app)
        .post('/api/wallet/fund/initialize')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          amount: 5000,
          provider: 'KUDA',
          currency: 'NGN'
        });

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        message: 'Payment initialized successfully',
        payment: {
          provider: 'KUDA',
          reference: 'WLT-KUDA-123',
          checkout_url: undefined,
          access_code: undefined,
          bank_details: {
            accountNumber: '2000000001',
            accountName: 'TRAKA',
            bankName: 'Kuda Microfinance Bank',
            bankCode: '090267'
          }
        }
      });
      expect(mockPaymentGatewayService.initializeWalletFunding).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          amount: 5000,
          provider: 'KUDA',
          currency: 'NGN'
        })
      );
    });

    it('verifies funding reference for authenticated user', async () => {
      mockPaymentGatewayService.verifyWalletFunding.mockResolvedValue({
        reference: 'WLT-KUDA-123',
        provider: 'KUDA',
        status: 'SUCCESS',
        amount: 5000,
        processed: true,
        message: 'Wallet funded successfully'
      });

      const response = await request(app)
        .get('/api/wallet/fund/verify')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({
          reference: 'WLT-KUDA-123',
          provider: 'KUDA'
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        message: 'Wallet funded successfully',
        payment: {
          reference: 'WLT-KUDA-123',
          provider: 'KUDA',
          status: 'SUCCESS',
          amount: 5000,
          processed: true,
          message: 'Wallet funded successfully'
        }
      });
    });

    it('rejects invalid webhook signatures', async () => {
      mockPaymentGatewayService.handleWebhook.mockResolvedValue({
        processed: false,
        message: 'Invalid webhook signature'
      });

      const response = await request(app)
        .post('/api/wallet/webhook/kuda')
        .send({
          notificationType: 'COLLECTION',
          data: {
            trackingReference: 'WLT-KUDA-123',
            amount: 5000
          }
        });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: 'Invalid webhook signature' });
    });

    it('processes successful webhook events', async () => {
      mockPaymentGatewayService.handleWebhook.mockResolvedValue({
        processed: true,
        message: 'Wallet funded successfully'
      });

      const response = await request(app)
        .post('/api/wallet/webhook/kuda')
        .send({
          notificationType: 'COLLECTION',
          data: {
            trackingReference: 'WLT-KUDA-123',
            amount: 5000
          }
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'Wallet funded successfully' });
    });
  });
});
