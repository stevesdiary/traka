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
  full_name: Joi.string().min(2).required().messages({
    'string.min': 'Full name must be at least 2 characters long',
    'any.required': 'Full name is required'
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
  full_name: Joi.string().min(2).required().messages({
    'string.min': 'Full name must be at least 2 characters long',
    'any.required': 'Full name is required'
  }),
  phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).required().messages({
    'string.pattern.base': 'Please provide a valid phone number',
    'any.required': 'Phone number is required'
  }),
  license_number: Joi.string().required().messages({
    'any.required': 'License number is required'
  }),
  vehicle_type: Joi.string().valid('BICYCLE', 'MOTORCYCLE', 'CAR', 'VAN', 'TRUCK').required().messages({
    'any.only': 'Vehicle type must be one of: BICYCLE, MOTORCYCLE, CAR, VAN, TRUCK',
    'any.required': 'Vehicle type is required'
  }),
  vehicle_plate: Joi.string().required().messages({
    'any.required': 'Vehicle plate number is required'
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
  })
});

export const GuestTrackingSchema = Joi.object({
  tracking_number: Joi.string().required().messages({
    'any.required': 'Tracking number is required'
  }),
  guest_token: Joi.string().optional()
});

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
  full_name: Joi.string().min(2).optional().messages({
    'string.min': 'Full name must be at least 2 characters long'
  }),
  phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).optional().messages({
    'string.pattern.base': 'Please provide a valid phone number'
  }),
  vehicle_type: Joi.string().valid('BICYCLE', 'MOTORCYCLE', 'CAR', 'VAN', 'TRUCK').optional().messages({
    'any.only': 'Vehicle type must be one of: BICYCLE, MOTORCYCLE, CAR, VAN, TRUCK'
  }),
  vehicle_plate: Joi.string().optional(),
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