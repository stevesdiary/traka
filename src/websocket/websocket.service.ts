import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { MessageModel } from '../message/message.model.js';
import { PackageModel } from '../package/package.model.js';
import { RiderModel } from '../rider/rider.model.js';
import { UserModel } from '../user/user.model.js';
import { TrackingTokenService } from '../tracking/tracking-token.service.js';
import logger from '../utils/logger.js';

export interface NewJobOfferPayload {
  type: 'new-job-offer';
  requestId: string;
  /** Present when the offer is backed by a real Package record. */
  packageId?: string;
  courierId: string;
  fee: number;
  pickupAddress: string;
  dropoffAddress: string;
  distanceMeters: number;
  distanceKm: number;
  etaSeconds: number;
  etaMinutes: number;
  packageType: string;
  packageSize: string;
  weightKg: number;
  vehicleType: string;
  expiresAt: number;
}

export interface DeliveryAssignedPayload {
  type: 'delivery-assigned';
  packageId: string;
  trackingNumber: string;
  pickupAddress: string;
  dropoffAddress: string;
  etaSeconds: number;
}

export class WebSocketService {
  private io: SocketIOServer;

  constructor(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.CLIENT_URL || 'http://localhost:5173',
        credentials: true
      }
    });

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  private setupMiddleware() {
    this.io.use(async (socket, next) => {
      try {
        // Path 1: recipient tracking link (no user account required)
        const trackingToken = socket.handshake.auth.trackingToken;
        if (trackingToken) {
          const payload = TrackingTokenService.verify(trackingToken);
          if (!payload) return next(new Error('Invalid or expired tracking token'));
          socket.data.trackingPackageId = payload.packageId;
          socket.data.isTrackingOnly = true;
          return next();
        }

        // Path 2: authenticated user (sender / rider)
        const token = socket.handshake.auth.token;
        if (!token) return next(new Error('Authentication required'));

        const decoded = jwt.verify(token, process.env.JWT_SECRET!, { algorithms: ['HS256'] }) as any;
        socket.data.userId = decoded.id;
        next();
      } catch (error) {
        next(new Error('Invalid token'));
      }
    });
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket) => {
      logger.info(`Client connected: ${socket.id}`);

      socket.on('join-package', async (packageId: string) => {
        try {
          const pkg = await PackageModel.findByPk(packageId);
          if (!pkg) return;

          const isAuthorized = pkg.sender_id === socket.data.userId || pkg.rider_id === socket.data.userId;
          if (!isAuthorized) return;

          socket.join(`package:${packageId}`);
        } catch (error) {
          logger.error('Error joining package room', error);
        }
      });

      socket.on('leave-package', (packageId: string) => {
        socket.leave(`package:${packageId}`);
      });

      socket.on('join-rider', async (riderId: string) => {
        try {
          if (typeof riderId !== 'string' || !riderId || !socket.data.userId) return;

          // The rider can join either as the user id itself or via an owned rider profile
          if (riderId === socket.data.userId) {
            socket.join(`rider:${riderId}`);
            return;
          }

          const rider = await RiderModel.findByPk(riderId);
          if (rider && rider.user_id === socket.data.userId) {
            socket.join(`rider:${riderId}`);
          }
        } catch (error) {
          logger.error('Error joining rider room', error);
        }
      });

      socket.on('leave-rider', (riderId: string) => {
        if (typeof riderId === 'string' && riderId) {
          socket.leave(`rider:${riderId}`);
        }
      });

      socket.on('join-tracking', async (packageId: string) => {
        try {
          // Tracking-only sockets: token already scoped to a specific package
          if (socket.data.isTrackingOnly) {
            if (socket.data.trackingPackageId !== packageId) return;
            socket.join(`tracking:package:${packageId}`);
            return;
          }

          const pkg = await PackageModel.findByPk(packageId);
          if (!pkg) return;

          const isAuthorized =
            pkg.sender_id === socket.data.userId ||
            pkg.recipient_id === socket.data.userId ||
            pkg.rider_id === socket.data.userId;

          if (!isAuthorized) return;
          socket.join(`tracking:package:${packageId}`);
        } catch (error) {
          logger.error('Error joining tracking room', error);
        }
      });

      socket.on('leave-tracking', (packageId: string) => {
        socket.leave(`tracking:package:${packageId}`);
      });

      socket.on('send-message', async (data: { packageId: string; message?: string; content?: string }) => {
        try {
          const { packageId } = data;
          const message = (data.content ?? data.message ?? '').trim();
          if (!packageId || !message) return;
          
          const pkg = await PackageModel.findByPk(packageId);
          if (!pkg) return;

          const isAuthorized = pkg.sender_id === socket.data.userId || pkg.rider_id === socket.data.userId;
          if (!isAuthorized) return;

          const newMessage = await MessageModel.create({
            package_id: packageId,
            sender_id: socket.data.userId,
            message
          });

          const messageWithSender = await MessageModel.findByPk(newMessage.id, {
            include: [{ 
              model: UserModel, 
              as: 'sender',
              attributes: ['id', 'first_name', 'surname', 'email']
            }]
          });

          this.io.to(`package:${packageId}`).emit('new-message', messageWithSender);
        } catch (error) {
          logger.error('Error sending message', error);
        }
      });

      socket.on('disconnect', () => {
        logger.info(`Client disconnected: ${socket.id}`);
      });
    });
  }

  emitRiderLocationUpdate(
    packageId: string,
    payload: {
      package_id: string;
      tracking_number: string;
      rider_id: string;
      latitude: number;
      longitude: number;
      timestamp: number;
      package_status: string;
    }
  ): void {
    this.io.to(`tracking:package:${packageId}`).emit('rider-location-update', payload);
  }

  emitNewJobOffer(riderId: string, payload: NewJobOfferPayload): void {
    this.io.to(`rider:${riderId}`).emit('new-job-offer', payload);
  }

  emitDeliveryAssigned(riderId: string, payload: DeliveryAssignedPayload): void {
    this.io.to(`rider:${riderId}`).emit('delivery-assigned', payload);
  }
}

let webSocketService: WebSocketService | null = null;

export const initializeWebSocket = (httpServer: HTTPServer): WebSocketService => {
  webSocketService = new WebSocketService(httpServer);
  return webSocketService;
};

export const emitRiderLocationUpdate = (
  packageId: string,
  payload: {
    package_id: string;
    tracking_number: string;
    rider_id: string;
    latitude: number;
    longitude: number;
    timestamp: number;
    package_status: string;
  }
): void => {
  if (!webSocketService) {
    return;
  }

  webSocketService.emitRiderLocationUpdate(packageId, payload);
};

export const emitNewJobOffer = (riderId: string, payload: NewJobOfferPayload): void => {
  if (!webSocketService) {
    return;
  }

  webSocketService.emitNewJobOffer(riderId, payload);
};

export const emitDeliveryAssigned = (riderId: string, payload: DeliveryAssignedPayload): void => {
  if (!webSocketService) {
    return;
  }

  webSocketService.emitDeliveryAssigned(riderId, payload);
};
