import Joi from 'joi';

export const serviceAreaSchema = Joi.object({
  city: Joi.string().required().min(2).max(100),
  state: Joi.string().required().min(2).max(100),
  country: Joi.string().required().min(2).max(100),
  latitude: Joi.number().optional().min(-90).max(90),
  longitude: Joi.number().optional().min(-180).max(180),
  radius_km: Joi.number().optional().min(1).max(500)
});

export const checkCoverageSchema = Joi.object({
  city: Joi.string().optional().min(2).max(100),
  state: Joi.string().optional().min(2).max(100),
  latitude: Joi.number().optional().min(-90).max(90),
  longitude: Joi.number().optional().min(-180).max(180)
}).custom((value, helpers) => {
  const hasGeo = typeof value.latitude === 'number' && typeof value.longitude === 'number';
  const hasCity = typeof value.city === 'string' && typeof value.state === 'string';

  if (!hasGeo && !hasCity) {
    return helpers.message({ any: 'Provide either latitude & longitude or city & state' });
  }
  if ((value.latitude === undefined) !== (value.longitude === undefined)) {
    return helpers.message({ any: 'Both latitude and longitude are required together' });
  }
  return value;
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
