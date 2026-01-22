import Joi from 'joi';

export const calculatePriceSchema = Joi.object({
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
  package_weight: Joi.number().positive().optional().messages({
    'number.positive': 'Package weight must be positive'
  }),
  delivery_speed: Joi.string().valid('STANDARD', 'EXPRESS', 'SAME_DAY').required().messages({
    'any.only': 'Delivery speed must be STANDARD, EXPRESS, or SAME_DAY',
    'any.required': 'Delivery speed is required'
  })
});
