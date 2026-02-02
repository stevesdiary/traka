import Joi from 'joi';

// Auth Schemas
export const LoginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required'
  }),
  password: Joi.string().min(6).required().messages({
    'string.min': 'Password must be at least 6 characters long',
    'any.required': 'Password is required'
  })
});

// Registration Schemas
export const CustomerRegistrationSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required'
  }),
  password: Joi.string().min(6).required().messages({
    'string.min': 'Password must be at least 6 characters long',
    'any.required': 'Password is required'
  }),
  first_name: Joi.string().min(2).required().messages({
    'string.min': 'First name must be at least 2 characters long',
    'any.required': 'First name is required'
  }),
  last_name: Joi.string().min(2).required().messages({
    'string.min': 'Last name must be at least 2 characters long',
    'any.required': 'Last name is required'
  }),
  phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).required().messages({
    'string.pattern.base': 'Please provide a valid phone number',
    'any.required': 'Phone number is required'
  })
});

export const BusinessRegistrationSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required'
  }),
  password: Joi.string().min(6).required().messages({
    'string.min': 'Password must be at least 6 characters long',
    'any.required': 'Password is required'
  }),
  business_name: Joi.string().min(2).required().messages({
    'string.min': 'Business name must be at least 2 characters long',
    'any.required': 'Business name is required'
  }),
  business_address: Joi.string().required().messages({
    'any.required': 'Business address is required'
  }),
  contact_person: Joi.string().min(2).required().messages({
    'string.min': 'Contact person name must be at least 2 characters long',
    'any.required': 'Contact person is required'
  }),
  phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).required().messages({
    'string.pattern.base': 'Please provide a valid phone number',
    'any.required': 'Phone number is required'
  })
});

export const RiderRegistrationSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required'
  }),
  password: Joi.string().min(6).required().messages({
    'string.min': 'Password must be at least 6 characters long',
    'any.required': 'Password is required'
  }),
  first_name: Joi.string().min(2).required().messages({
    'string.min': 'First name must be at least 2 characters long',
    'any.required': 'First name is required'
  }),
  last_name: Joi.string().min(2).required().messages({
    'string.min': 'Last name must be at least 2 characters long',
    'any.required': 'Last name is required'
  }),
  phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).required().messages({
    'string.pattern.base': 'Please provide a valid phone number',
    'any.required': 'Phone number is required'
  }),
  license_number: Joi.string().when('vehicle_type', {
    is: 'BICYCLE',
    then: Joi.optional(),
    otherwise: Joi.required().messages({
      'any.required': 'License number is required for non-bicycle vehicles'
    })
  }),
  vehicle_type: Joi.string().valid('BICYCLE', 'MOTORCYCLE').required().messages({
    'any.only': 'Vehicle type must be BICYCLE or MOTORCYCLE',
    'any.required': 'Vehicle type is required'
  }),
  vehicle_plate: Joi.string().when('vehicle_type', {
    is: 'BICYCLE',
    then: Joi.optional(),
    otherwise: Joi.required().messages({
      'any.required': 'Vehicle plate number is required for non-bicycle vehicles'
    })
  }),
  business_id: Joi.string().optional()
});

export const RiderProfileCreationSchema = Joi.object({
  license_number: Joi.string().when('vehicle_type', {
    is: 'BICYCLE',
    then: Joi.optional(),
    otherwise: Joi.required().messages({
      'any.required': 'License number is required for non-bicycle vehicles'
    })
  }),
  vehicle_type: Joi.string().valid('BICYCLE', 'MOTORCYCLE').required().messages({
    'any.only': 'Vehicle type must be BICYCLE or MOTORCYCLE',
    'any.required': 'Vehicle type is required'
  }),
  vehicle_plate: Joi.string().when('vehicle_type', {
    is: 'BICYCLE',
    then: Joi.optional(),
    otherwise: Joi.required().messages({
      'any.required': 'Vehicle plate number is required for non-bicycle vehicles'
    })
  }),
  business_id: Joi.string().optional()
});

// Package Schemas
export const CreatePackageSchema = Joi.object({
  recipient_name: Joi.string().min(2).required().messages({
    'string.min': 'Recipient name must be at least 2 characters long',
    'any.required': 'Recipient name is required'
  }),
  recipient_email: Joi.string().email().optional().messages({
    'string.email': 'Please provide a valid recipient email address'
  }),
  recipient_phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).required().messages({
    'string.pattern.base': 'Please provide a valid phone number',
    'any.required': 'Recipient phone number is required'
  }),
  pickup_address: Joi.string().required().messages({
    'any.required': 'Pickup address is required'
  }),
  delivery_address: Joi.string().required().messages({
    'any.required': 'Delivery address is required'
  }),
  description: Joi.string().required().messages({
    'any.required': 'Package description is required'
  }),
  delivery_notes: Joi.string().optional(),
  package_size: Joi.string().valid('SMALL', 'MEDIUM', 'LARGE').required().messages({
    'any.only': 'Package size must be SMALL, MEDIUM, or LARGE',
    'any.required': 'Package size is required'
  }),
  package_weight: Joi.number().positive().optional().messages({
    'number.positive': 'Package weight must be a positive number'
  }),
  delivery_speed: Joi.string().valid('STANDARD', 'EXPRESS', 'SAME_DAY').required().messages({
    'any.only': 'Delivery speed must be STANDARD, EXPRESS, or SAME_DAY',
    'any.required': 'Delivery speed is required'
  }),
  category: Joi.string().valid(
    'FOOD',
    'SHOES',
    'ELECTRONICS',
    'CLOTHING',
    'JEWELRY_VALUABLES',
    'GROCERIES',
    'DOCUMENTS',
    'HEALTH_PHARMACEUTICALS',
    'CONSTRUCTION_MATERIALS',
    'HOUSEHOLD_ITEMS',
    'OTHERS'
  ).required().messages({
    'any.only': 'Invalid package category',
    'any.required': 'Package category is required'
  }),
  is_fragile: Joi.boolean().optional().default(false)
});

export const GuestTrackingSchema = Joi.object({
  tracking_number: Joi.string().required().messages({
    'any.required': 'Tracking number is required'
  }),
  guest_token: Joi.string().optional()
});

// Business (new lightweight business profile)
export const BusinessCreateSchema = Joi.object({
  business_name: Joi.string().min(2).required().messages({
    'string.min': 'Business name must be at least 2 characters long',
    'any.required': 'Business name is required'
  }),
  business_address: Joi.string().allow('', null).optional(),
  contact_person: Joi.string().allow('', null).optional(),
  phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).allow('', null).optional().messages({
    'string.pattern.base': 'Please provide a valid phone number'
  })
});

export const BusinessUpdateSchema = Joi.object({
  business_name: Joi.string().min(2).optional(),
  business_address: Joi.string().allow('', null).optional(),
  contact_person: Joi.string().allow('', null).optional(),
  phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).allow('', null).optional().messages({
    'string.pattern.base': 'Please provide a valid phone number'
  })
}).min(1);

export const TrackingNumberSchema = Joi.object({
  tracking_number: Joi.string().required().messages({
    'any.required': 'Tracking number is required'
  })
});

export const PackageIdSchema = Joi.object({
  package_id: Joi.string().required().messages({
    'any.required': 'Package ID is required'
  })
});

export const ConfirmDeliverySchema = Joi.object({
  package_id: Joi.string().required().messages({
    'any.required': 'Package ID is required'
  }),
  confirmation_code: Joi.string().length(6).required().messages({
    'string.length': 'Confirmation code must be exactly 6 characters',
    'any.required': 'Confirmation code is required'
  })
});

// Location Schemas
export const LocationUpdateSchema = Joi.object({
  latitude: Joi.number().min(-90).max(90).required().messages({
    'number.min': 'Latitude must be between -90 and 90 degrees',
    'number.max': 'Latitude must be between -90 and 90 degrees',
    'any.required': 'Latitude is required'
  }),
  longitude: Joi.number().min(-180).max(180).required().messages({
    'number.min': 'Longitude must be between -180 and 180 degrees',
    'number.max': 'Longitude must be between -180 and 180 degrees',
    'any.required': 'Longitude is required'
  }),
  package_id: Joi.string().optional()
});

// Verification Schemas
export const SendOTPSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required'
  })
});

export const VerifyOTPSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required'
  }),
  otp: Joi.string().length(6).required().messages({
    'string.length': 'OTP must be exactly 6 characters',
    'any.required': 'OTP is required'
  })
});

// User Management Schemas
export const CreateUserSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required'
  }),
  password: Joi.string().min(6).required().messages({
    'string.min': 'Password must be at least 6 characters long',
    'any.required': 'Password is required'
  }),
  role: Joi.string().valid('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'RIDER', 'USER').required().messages({
    'any.only': 'Role must be one of: SUPER_ADMIN, ADMIN, MANAGER, RIDER, USER',
    'any.required': 'Role is required'
  })
});

export const UpdateUserSchema = Joi.object({
  email: Joi.string().email().optional().messages({
    'string.email': 'Please provide a valid email address'
  }),
  role: Joi.string().valid('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'RIDER', 'USER').optional().messages({
    'any.only': 'Role must be one of: SUPER_ADMIN, ADMIN, MANAGER, RIDER, USER'
  })
});

// Commission Schemas
export const CreateCommissionSchema = Joi.object({
  package_id: Joi.string().required().messages({
    'any.required': 'Package ID is required'
  }),
  rider_id: Joi.string().required().messages({
    'any.required': 'Rider ID is required'
  }),
  delivery_fee: Joi.number().positive().required().messages({
    'number.positive': 'Delivery fee must be a positive number',
    'any.required': 'Delivery fee is required'
  })
});

// Rider Operational Schemas
export const UpdateLocationSchema = Joi.object({
  latitude: Joi.number().min(-90).max(90).required().messages({
    'number.min': 'Latitude must be between -90 and 90 degrees',
    'number.max': 'Latitude must be between -90 and 90 degrees',
    'any.required': 'Latitude is required'
  }),
  longitude: Joi.number().min(-180).max(180).required().messages({
    'number.min': 'Longitude must be between -180 and 180 degrees',
    'number.max': 'Longitude must be between -180 and 180 degrees',
    'any.required': 'Longitude is required'
  })
});

export const UpdateStatusSchema = Joi.object({
  status: Joi.string().valid('AVAILABLE', 'BUSY', 'OFFLINE').required().messages({
    'any.only': 'Status must be one of: AVAILABLE, BUSY, OFFLINE',
    'any.required': 'Status is required'
  })
});

// Rider Profile Schemas
export const UpdateRiderProfileSchema = Joi.object({
  first_name: Joi.string().min(2).optional().messages({
    'string.min': 'First name must be at least 2 characters long'
  }),
  last_name: Joi.string().min(2).optional().messages({
    'string.min': 'Last name must be at least 2 characters long'
  }),
  phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).optional().messages({
    'string.pattern.base': 'Please provide a valid phone number'
  }),
  vehicle_type: Joi.string().valid('BICYCLE', 'MOTORCYCLE').optional().messages({
    'any.only': 'Vehicle type must be BICYCLE or MOTORCYCLE'
  }),
  license_number: Joi.string().when('vehicle_type', {
    is: 'BICYCLE',
    then: Joi.optional(),
    otherwise: Joi.optional()
  }),
  vehicle_plate: Joi.string().when('vehicle_type', {
    is: 'BICYCLE',
    then: Joi.optional(),
    otherwise: Joi.optional()
  }),
  profile_photo: Joi.string().uri().optional().messages({
    'string.uri': 'Profile photo must be a valid URL'
  }),
  license_photo: Joi.string().uri().optional().messages({
    'string.uri': 'License photo must be a valid URL'
  }),
  vehicle_photo: Joi.string().uri().optional().messages({
    'string.uri': 'Vehicle photo must be a valid URL'
  })
});

// Package Cancellation Schema
export const CancelPackageSchema = Joi.object({
  cancellation_reason: Joi.string().valid(
    'PILOT_ASKED_TO_CANCEL',
    'LONG_PICKUP_TIME',
    'WRONG_ORDER_DETAILS',
    'RIDER_ASKING_DIFFERENT_MONEY',
    'RIDER_UNTIDY_NO_UNIFORM',
    'FOUND_ALTERNATIVE',
    'OTHER'
  ).required().messages({
    'any.only': 'Invalid cancellation reason',
    'any.required': 'Cancellation reason is required'
  }),
  cancellation_note: Joi.string().when('cancellation_reason', {
    is: 'OTHER',
    then: Joi.string().min(10).required().messages({
      'string.min': 'Please provide detailed reason (minimum 10 characters)',
      'any.required': 'Cancellation note is required when reason is OTHER'
    }),
    otherwise: Joi.string().optional()
  }),
  rider_has_package: Joi.boolean().required().messages({
    'any.required': 'Please confirm if rider has the package'
  })
});

// Rating Schema
export const CreateRatingSchema = Joi.object({
  package_id: Joi.string().required().messages({
    'any.required': 'Package ID is required'
  }),
  rider_id: Joi.string().required().messages({
    'any.required': 'Rider ID is required'
  }),
  rating: Joi.number().integer().min(1).max(5).required().messages({
    'number.min': 'Rating must be between 1 and 5',
    'number.max': 'Rating must be between 1 and 5',
    'any.required': 'Rating is required'
  }),
  review: Joi.string().max(500).optional().messages({
    'string.max': 'Review must not exceed 500 characters'
  })
});

// Matching Schemas
export const UpdateCourierLocationSchema = Joi.object({
  lat: Joi.number().min(-90).max(90).required().messages({
    'number.min': 'Latitude must be between -90 and 90',
    'number.max': 'Latitude must be between -90 and 90',
    'any.required': 'Latitude is required'
  }),
  lng: Joi.number().min(-180).max(180).required().messages({
    'number.min': 'Longitude must be between -180 and 180',
    'number.max': 'Longitude must be between -180 and 180',
    'any.required': 'Longitude is required'
  })
});

export const UpdateCourierStatusSchema = Joi.object({
  status: Joi.string().valid('AVAILABLE', 'BUSY', 'OFFLINE').required().messages({
    'any.only': 'Status must be AVAILABLE, BUSY, or OFFLINE',
    'any.required': 'Status is required'
  })
});

// Promotions
export const CreatePromotionSchema = Joi.object({
  code: Joi.string().trim().uppercase().min(3).max(30).pattern(/^[A-Z0-9_-]+$/).required().messages({
    'string.pattern.base': 'Promotion code can only contain letters, numbers, underscores, and dashes',
    'any.required': 'Promotion code is required'
  }),
  name: Joi.string().min(2).required().messages({
    'any.required': 'Promotion name is required'
  }),
  description: Joi.string().max(1000).optional(),
  discount_type: Joi.string().valid('PERCENTAGE', 'FIXED').required().messages({
    'any.only': 'Discount type must be PERCENTAGE or FIXED',
    'any.required': 'Discount type is required'
  }),
  discount_value: Joi.number().positive().required().messages({
    'any.required': 'Discount value is required'
  }),
  max_uses: Joi.number().integer().positive().optional(),
  max_uses_per_user: Joi.number().integer().positive().optional(),
  start_date: Joi.date().required().messages({
    'any.required': 'Start date is required'
  }),
  end_date: Joi.date().greater(Joi.ref('start_date')).required().messages({
    'date.greater': 'End date must be after start date',
    'any.required': 'End date is required'
  }),
  is_active: Joi.boolean().optional()
});

export const UpdatePromotionSchema = Joi.object({
  code: Joi.string().trim().uppercase().min(3).max(30).pattern(/^[A-Z0-9_-]+$/).optional(),
  name: Joi.string().min(2).optional(),
  description: Joi.string().max(1000).optional(),
  discount_type: Joi.string().valid('PERCENTAGE', 'FIXED').optional(),
  discount_value: Joi.number().positive().optional(),
  max_uses: Joi.number().integer().positive().optional(),
  max_uses_per_user: Joi.number().integer().positive().optional(),
  start_date: Joi.date().optional(),
  end_date: Joi.date().optional(),
  is_active: Joi.boolean().optional()
});

export const RedeemPromotionSchema = Joi.object({
  code: Joi.string().trim().uppercase().min(3).max(30).required().messages({
    'any.required': 'Promotion code is required'
  }),
  amount: Joi.number().positive().optional(),
  currency: Joi.string().length(3).optional(),
  package_id: Joi.string().optional()
});

export const FindCouriersSchema = Joi.object({
  pickupLocation: Joi.object({
    lat: Joi.number().required(),
    lng: Joi.number().required(),
    address: Joi.string().required()
  }).required(),
  dropoffLocation: Joi.object({
    lat: Joi.number().required(),
    lng: Joi.number().required(),
    address: Joi.string().required()
  }).required(),
  package: Joi.object({
    weight: Joi.number().positive().required(),
    size: Joi.string().valid('SMALL', 'MEDIUM', 'LARGE').required()
  }).required(),
  vehicleType: Joi.string().valid('BICYCLE', 'MOTORCYCLE', 'VAN').optional()
});

// Tenant Approval Schema
export const TenantApprovalSchema = Joi.object({
  approval_notes: Joi.string().optional()
});

// Commission Payment Schema
export const PayCommissionSchema = Joi.object({
  payment_method: Joi.string().valid('BANK_TRANSFER', 'CASH', 'MOBILE_MONEY').optional(),
  payment_reference: Joi.string().optional()
});

// Password Reset Schemas
export const PasswordResetRequestSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required'
  })
});

export const PasswordResetConfirmSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required'
  }),
  code: Joi.string().length(6).required().messages({
    'string.length': 'Reset code must be exactly 6 digits',
    'any.required': 'Reset code is required'
  }),
  new_password: Joi.string().min(6).required().messages({
    'string.min': 'Password must be at least 6 characters long',
    'any.required': 'New password is required'
  })
});

export const UpdatePasswordSchema = Joi.object({
  current_password: Joi.string().required().messages({
    'any.required': 'Current password is required'
  }),
  new_password: Joi.string().min(6).required().messages({
    'string.min': 'New password must be at least 6 characters long',
    'any.required': 'New password is required'
  })
});
