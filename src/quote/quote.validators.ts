import Joi from 'joi';

export const createQuoteSchema = Joi.object({
  pickup_address: Joi.string().required().messages({
    'string.empty': 'Pickup address is required',
    'any.required': 'Pickup address is required'
  }),
  delivery_address: Joi.string().required().messages({
    'string.empty': 'Delivery address is required',
    'any.required': 'Delivery address is required'
  }),
  package_size: Joi.string().valid('SMALL', 'MEDIUM', 'LARGE').required().messages({
    'any.only': 'Package size must be SMALL, MEDIUM, or LARGE',
    'any.required': 'Package size is required'
  }),
  package_weight: Joi.number().positive().max(40).optional().messages({
    'number.positive': 'Package weight must be positive',
    'number.max': 'Package weight must be 40kg or less'
  }),
  delivery_speed: Joi.string().valid('STANDARD', 'EXPRESS', 'SAME_DAY').required().messages({
    'any.only': 'Delivery speed must be STANDARD, EXPRESS, or SAME_DAY',
    'any.required': 'Delivery speed is required'
  }),
  contact_email: Joi.string().email().optional().messages({
    'string.email': 'Contact email must be valid'
  }),
  anonymous_session_id: Joi.string().optional()
});
