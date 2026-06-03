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
import { authenticateToken, requireRole } from "../middleware/auth.middleware.js";
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

const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many password reset attempts, please try again later' }
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
  registerLimiter,
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

export default router;
