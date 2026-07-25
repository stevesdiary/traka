import { Request, Response } from 'express';
import { ServiceAreaService } from './service-area.service.js';
import { serviceAreaSchema, checkCoverageSchema } from '../utils/service-area.validators.js';
import config from '../config/environment.js';

const serviceAreaService = new ServiceAreaService();

export class ServiceAreaController {
  async getActiveCities(req: Request, res: Response) {
    try {
      const cities = await serviceAreaService.getActiveCities();
      res.json({ success: true, cities });
    } catch (error: any) {
      res.status(500).json({ success: false, ...(config.isDevelopment && { message: error.message }) });
    }
  }

  async checkCoverage(req: Request, res: Response) {
    try {
      const { error } = checkCoverageSchema.validate(req.query);
      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details[0].message
        });
      }

      const { city, state } = req.query;

      const result = await serviceAreaService.checkCoverage(
        String(city),
        String(state)
      );

      res.json({
        success: true,
        covered: result.covered,
        city: result.city,
        message: result.covered
          ? `Service available in ${result.city}`
          : 'Service not available in this area. Join our waitlist!'
      });
    } catch (error: any) {
      res.status(500).json({ success: false, ...(config.isDevelopment && { message: error.message }) });
    }
  }

  async addServiceArea(req: Request, res: Response) {
    try {
      const { error, value } = serviceAreaSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details[0].message
        });
      }

      const area = await serviceAreaService.addServiceArea(value);

      res.status(201).json({ success: true, area });
    } catch (error: any) {
      res.status(500).json({ success: false, ...(config.isDevelopment && { message: error.message }) });
    }
  }
}
