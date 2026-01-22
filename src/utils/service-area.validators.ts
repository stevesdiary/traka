import Joi from 'joi';

export const serviceAreaSchema = Joi.object({
  city: Joi.string().required().min(2).max(100),
  state: Joi.string().required().min(2).max(100),
  country: Joi.string().required().min(2).max(100)
});

export const checkCoverageSchema = Joi.object({
  city: Joi.string().required().min(2).max(100),
  state: Joi.string().required().min(2).max(100)
});

export const waitlistSchema = Joi.object({
  name: Joi.string().required().min(2).max(100),
  email: Joi.string().email().required(),
  location: Joi.string().required().min(3).max(255),
  city: Joi.string().optional().min(2).max(100),
  latitude: Joi.number().optional().min(-90).max(90),
  longitude: Joi.number().optional().min(-180).max(180)
});

export const notifyWaitlistSchema = Joi.object({
  city: Joi.string().required().min(2).max(100)
});
