import { Router } from "express";
import {
  login,
  registerCustomer,
  registerBusiness,
  registerRider,
  register,
} from "../middleware/auth.middleware.js";
import { validateInput } from "../middleware/validation.middleware.js";
import {
  LoginSchema,
  CustomerRegistrationSchema,
  BusinessRegistrationSchema,
  RiderRegistrationSchema,
} from "../utils/validators.js";

const router: Router = Router();

// Authentication
router.post("/login", validateInput(LoginSchema), login);

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

// Legacy registration (kept for backward compatibility)
router.post("/register", register);

export default router;
