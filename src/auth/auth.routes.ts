import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  login,
  registerCustomer,
  registerBusiness,
  registerRider,
  register,
  registerAdmin,
  logout,
  getMe,
  refresh,
} from "./auth.controller.js";
import { setup2FA, verifySetup2FA, verify2FA, disable2FA } from "./2fa.controller.js";
import { authenticateToken, requireRole } from "../middleware/auth.middleware.js";
import { requireTOTPChallenge } from "../middleware/totp-challenge.middleware.js";
import { validateInput } from "../middleware/validation.middleware.js";
import {
  LoginSchema,
  CustomerRegistrationSchema,
  BusinessRegistrationSchema,
  RiderRegistrationSchema,
  PasswordResetRequestSchema,
  PasswordResetConfirmSchema,
  UpdatePasswordSchema,
  ProfilePhotoUpdateSchema,
  ProfileUpdateSchema,
} from "../utils/validators.js";
import { AuthService } from "./auth.service.js";
import { Request, Response } from "express";
import { UserRepository } from "../user/user.repository.js";

const router: Router = Router();
const authService = new AuthService();
const userRepository = new UserRepository();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts, please try again later' }
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many registration attempts, please try again later' }
});

const businessRegisterLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many registration attempts, please try again later' }
});

const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many password reset attempts, please try again later' }
});

const totpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many 2FA attempts, please try again later' }
});

// Authentication
router.post("/login", loginLimiter, validateInput(LoginSchema), login);
router.post("/logout", authenticateToken, logout);
router.get("/me", authenticateToken, getMe);
router.post("/refresh", refresh);

// Registration endpoints
router.post(
  "/register/customer",
  registerLimiter,
  validateInput(CustomerRegistrationSchema),
  registerCustomer
);
router.post(
  "/register/business",
  businessRegisterLimiter,
  validateInput(BusinessRegistrationSchema),
  registerBusiness
);
router.post(
  "/register/rider",
  registerLimiter,
  validateInput(RiderRegistrationSchema),
  registerRider
);

// Admin registration (Super Admin only)
router.post(
  "/register/admin",
  authenticateToken,
  requireRole(['SUPER_ADMIN']),
  registerAdmin
);

// Legacy registration (kept for backward compatibility)
router.post("/register", register);

// Password reset
router.post(
  "/password/reset-request",
  passwordResetLimiter,
  validateInput(PasswordResetRequestSchema),
  async (req: Request, res: Response) => {
    try {
      await authService.requestPasswordReset(req.body.email);
      res.json({ message: 'Password reset code sent to your email' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

router.post(
  "/password/reset-confirm",
  passwordResetLimiter,
  validateInput(PasswordResetConfirmSchema),
  async (req: Request, res: Response) => {
    try {
      const { email, code, new_password } = req.body;
      await authService.resetPassword(email, code, new_password);
      res.json({ message: 'Password reset successfully' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

// Update password (authenticated users)
router.put(
  "/password/update",
  authenticateToken,
  validateInput(UpdatePasswordSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      const { current_password, new_password } = req.body;
      await authService.updatePassword(userId, current_password, new_password);
      res.json({ message: 'Password updated successfully' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

// Profile update (name, phone)
router.patch(
  "/me",
  authenticateToken,
  validateInput(ProfileUpdateSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      const { first_name, surname, phone } = req.body;
      const updates: Record<string, string> = {};
      if (first_name) updates.first_name = first_name;
      if (surname) updates.surname = surname;
      if (phone) updates.phone = phone;
      await userRepository.updateById(userId, updates);
      const user = await userRepository.findById(userId);
      res.json({
        message: 'Profile updated successfully',
        user: {
          id: user!.id,
          email: user!.email,
          first_name: user!.first_name,
          surname: user!.surname,
          phone: user!.phone,
          role: user!.role,
          type: user!.type,
        }
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to update profile' });
    }
  }
);

// Profile photo update
router.put(
  "/me/profile-photo",
  authenticateToken,
  validateInput(ProfilePhotoUpdateSchema),
  async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      const { profile_photo } = req.body;
      const updated = await userRepository.updateById(userId, { profile_photo });
      res.json({ message: 'Profile photo updated', profile_photo });
    } catch (error: any) {
      res.status(400).json({ error: error.message || 'Failed to update profile photo' });
    }
  }
);

// ─── 2FA routes (ADMIN / SUPER_ADMIN only) ───────────────────────────────────

// Step 1 of enrollment: generate QR code (requires setup_token from login)
router.post(
  '/2fa/setup',
  totpLimiter,
  requireTOTPChallenge('2fa_setup'),
  setup2FA
);

// Step 2 of enrollment: confirm first code → activates 2FA, issues full JWT
router.post(
  '/2fa/setup/verify',
  totpLimiter,
  requireTOTPChallenge('2fa_setup'),
  verifySetup2FA
);

// Login-time TOTP verification → issues full JWT
router.post(
  '/2fa/verify',
  totpLimiter,
  requireTOTPChallenge('2fa_challenge'),
  verify2FA
);

// Disable 2FA (SUPER_ADMIN only, requires own password + TOTP)
router.delete(
  '/2fa',
  authenticateToken,
  requireRole(['SUPER_ADMIN']),
  disable2FA
);

export default router;
