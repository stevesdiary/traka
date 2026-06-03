import { Request, Response } from 'express';
import { CourierPresenceService } from '../services/CourierPresenceService.js';
import { MatchingEngine } from '../services/MatchingEngine.js';
import { DispatchService } from '../services/DispatchService.js';
import { DeliveryRequest } from '../models/CourierState.js';
import logger from '../../utils/logger.js';
import { VehicleType } from '../config/vehicles.js';

export class MatchingController {
  // Courier presence endpoints
  updateLocation = async (req: Request, res: Response): Promise<void> => {
    try {
      const { courierId } = req.params;
      const { lat, lng } = req.body;

      await CourierPresenceService.updateCourierLocation(courierId, {
        lat,
        lng,
        timestamp: Date.now()
      });

      res.json({
        message: 'Location updated successfully',
        timestamp: Date.now()
      });
    } catch (error: any) {
      logger.error('Update location error', { error: (error as Error).message });
      res.status(500).json({ error: 'Failed to update location' });
    }
  };

  updateStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const { courierId } = req.params;
      const { status } = req.body;

      await CourierPresenceService.updateCourierStatus(courierId, status);

      res.json({
        message: 'Status updated successfully',
        status
      });
    } catch (error: any) {
      console.error('Update status error:', error);
      res.status(500).json({ error: 'Failed to update status' });
    }
  };

  getCourierState = async (req: Request, res: Response): Promise<void> => {
    try {
      const { courierId } = req.params;
      const state = await CourierPresenceService.getCourierState(courierId);

      res.json({
        courier: state
      });
    } catch (error: any) {
      console.error('Get courier state error:', error);
      res.status(500).json({ error: 'Failed to get courier state' });
    }
  };

  // Matching endpoints
  findCouriers = async (req: Request, res: Response): Promise<void> => {
    try {
      const deliveryRequest: DeliveryRequest = {
        id: `req_${Date.now()}`,
        pickupLocation: req.body.pickupLocation,
        dropoffLocation: req.body.dropoffLocation,
        package: req.body.package,
        requiredVehicleType: req.body.vehicleType as VehicleType,
        createdAt: Date.now()
      };

      const matches = await MatchingEngine.findMatchingCouriers(deliveryRequest);

      res.json({
        message: 'Couriers found',
        matches: matches.map(match => ({
          courierId: match.courier.id,
          vehicleType: match.courier.vehicleType,
          eta: Math.round(match.eta),
          distance: Math.round(match.distance),
          score: match.score,
          location: match.courier.location
        })),
        count: matches.length
      });
    } catch (error: any) {
      console.error('Find couriers error:', error);
      res.status(500).json({ error: 'Failed to find couriers' });
    }
  };

  requestDelivery = async (req: Request, res: Response): Promise<void> => {
    try {
      const deliveryRequest: DeliveryRequest = {
        id: `delivery_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        pickupLocation: req.body.pickupLocation,
        dropoffLocation: req.body.dropoffLocation,
        package: req.body.package,
        requiredVehicleType: req.body.vehicleType as VehicleType,
        createdAt: Date.now()
      };

      // Handle bicycle constraint specifically
      if (req.body.vehicleType === VehicleType.BICYCLE) {
        const bicycleResult = await MatchingEngine.handleBicycleConstraint(deliveryRequest);
        
        if (!bicycleResult.bicycleAvailable) {
          res.json({
            success: false,
            message: bicycleResult.message,
            alternatives: bicycleResult.alternatives.map(alt => ({
              courierId: alt.courier.id,
              vehicleType: alt.courier.vehicleType,
              eta: Math.round(alt.eta),
              distance: Math.round(alt.distance)
            }))
          });
          return;
        }
      }

      const result = await DispatchService.dispatchDelivery(deliveryRequest);

      if (result.success) {
        res.json({
          success: true,
          message: result.message,
          deliveryId: deliveryRequest.id,
          assignedCourier: {
            id: result.assignedCourier!.id,
            vehicleType: result.assignedCourier!.vehicleType,
            location: result.assignedCourier!.location
          },
          eta: Math.round(result.eta!),
          attempts: result.attempts
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message,
          attempts: result.attempts
        });
      }
    } catch (error: any) {
      console.error('Request delivery error:', error);
      res.status(500).json({ error: 'Failed to request delivery' });
    }
  };

  // Courier response endpoints
  acceptOffer = async (req: Request, res: Response): Promise<void> => {
    try {
      const { courierId, requestId } = req.params;
      const success = await DispatchService.acceptOffer(courierId, requestId);

      if (success) {
        res.json({
          message: 'Offer accepted successfully',
          requestId,
          courierId
        });
      } else {
        res.status(400).json({
          error: 'Offer not found or expired'
        });
      }
    } catch (error: any) {
      console.error('Accept offer error:', error);
      res.status(500).json({ error: 'Failed to accept offer' });
    }
  };

  rejectOffer = async (req: Request, res: Response): Promise<void> => {
    try {
      const { courierId, requestId } = req.params;
      await DispatchService.rejectOffer(courierId, requestId);

      res.json({
        message: 'Offer rejected',
        requestId,
        courierId
      });
    } catch (error: any) {
      console.error('Reject offer error:', error);
      res.status(500).json({ error: 'Failed to reject offer' });
    }
  };

  // Debug endpoints
  getAvailableCouriers = async (req: Request, res: Response): Promise<void> => {
    try {
      const couriers = await CourierPresenceService.getAvailableCouriers();

      res.json({
        couriers: couriers.map(courier => ({
          id: courier.id,
          vehicleType: courier.vehicleType,
          status: courier.status,
          location: courier.location,
          acceptanceRate: courier.acceptanceRate,
          idleTime: courier.idleTime,
          lastSeen: courier.lastSeen
        })),
        count: couriers.length
      });
    } catch (error: any) {
      console.error('Get available couriers error:', error);
      res.status(500).json({ error: 'Failed to get available couriers' });
    }
  };
}