import { Router } from "express";
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
} from "../utils/validators.js";
import { AuthService } from "./auth.service.js";
import { Request, Response } from "express";

const router: Router = Router();
const authService = new AuthService();

// Authentication
router.post("/login", validateInput(LoginSchema), login);
router.post("/logout", authenticateToken, logout);
router.get("/me", authenticateToken, getMe);
router.post("/refresh", refresh);

// Registration endpoints
router.post(
  "/register/customer",
  validateInput(CustomerRegistrationSchema),
  registerCustomer
);
router.post(
  "/register/business",
  validateInput(BusinessRegistrationSchema),
  registerBusiness
);
router.post(
  "/register/rider",
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

export default router;
