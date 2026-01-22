import Joi from 'joi';

export const updateFuelPriceSchema = Joi.object({
  price_per_liter: Joi.number()
    .positive()
    .min(500)
    .max(10000)
    .required()
    .messages({
      'number.base': 'Price must be a number',
      'number.positive': 'Price must be positive',
      'number.min': 'Price must be at least ₦500',
      'number.max': 'Price cannot exceed ₦10,000',
      'any.required': 'Price per liter is required'
    })
});
