import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { MessageModel } from '../message/message.model.js';
import { PackageModel } from '../package/package.model.js';
import { UserModel } from '../user/user.model.js';
import logger from '../utils/logger.js';

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
        const token = socket.handshake.auth.token;
        if (!token) {
          return next(new Error('Authentication required'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
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

      socket.on('send-message', async (data: { packageId: string; message: string }) => {
        try {
          const { packageId, message } = data;
          
          const pkg = await PackageModel.findByPk(packageId);
          if (!pkg) return;

          const isAuthorized = pkg.sender_id === socket.data.userId || pkg.rider_id === socket.data.userId;
          if (!isAuthorized) return;

          const newMessage = await MessageModel.create({
            package_id: packageId,
            sender_id: socket.data.userId,
            message: message.trim()
          });

          const messageWithSender = await MessageModel.findByPk(newMessage.id, {
            include: [{ 
              model: UserModel, 
              as: 'sender',
              attributes: ['id', 'first_name', 'last_name', 'email']
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
}

let webSocketService: WebSocketService | null = null;

export const initializeWebSocket = (httpServer: HTTPServer): WebSocketService => {
  webSocketService = new WebSocketService(httpServer);
  return webSocketService;
};
