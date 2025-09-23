import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { logger } from '../utils/logger';

interface WebSocketMessage {
  type: 'appointment_created' | 'appointment_cancelled' | 'appointment_status_changed' | 'slot_availability_update';
  data: any;
  timestamp: number;
}

interface SlotAvailabilityUpdate {
  doctorId: string;
  date: string;
  timeSlot: string;
  isAvailable: boolean;
  appointmentId?: string;
}

class WebSocketService {
  private wss: WebSocketServer | null = null;
  private clients: Map<WebSocket, { userId?: string }> = new Map();

  initialize(server: Server) {
    this.wss = new WebSocketServer({ 
      server, 
      path: '/ws/appointments',
      verifyClient: (info: any) => {
        // Add authentication verification here if needed
        return true;
      }
    });

    this.wss.on('connection', (ws: WebSocket, request) => {
      logger.info('New WebSocket connection established');
      this.clients.set(ws, {});

      // Send welcome message
      this.sendToClient(ws, {
        type: 'slot_availability_update',
        data: { message: 'Connected to real-time appointment updates' },
        timestamp: Date.now()
      });

      // Handle client disconnect
      ws.on('close', () => {
        logger.info('WebSocket client disconnected');
        this.clients.delete(ws);
      });

      // Handle client errors
      ws.on('error', (error) => {
        logger.error({ error: error instanceof Error ? error.message : String(error) }, 'WebSocket client error');
        this.clients.delete(ws);
      });

      // Handle incoming messages from clients
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message.toString());
          this.handleClientMessage(ws, data);
        } catch (error) {
          logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Error parsing WebSocket message');
        }
      });
    });

    logger.info('WebSocket service initialized on /ws/appointments');
  }

  private handleClientMessage(ws: WebSocket, message: any) {
    // Handle client subscriptions, user identification, etc.
    if (message.type === 'subscribe_to_doctor') {
      logger.info(`Client subscribed to doctor updates: ${message.doctorId}`);
    } else if (message.type === 'identify_user') {
      // Store user ID for this connection
      const clientData = this.clients.get(ws);
      if (clientData) {
        clientData.userId = message.userId;
        this.clients.set(ws, clientData);
        logger.info(`User ${message.userId} identified on WebSocket connection`);
      }
    }
  }

  private sendToClient(ws: WebSocket, message: WebSocketMessage) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  private broadcast(message: WebSocketMessage, excludeUserId?: string) {
    this.clients.forEach((clientData, client) => {
      // Skip sending to the user who triggered the action
      if (excludeUserId && clientData.userId === excludeUserId) {
        return;
      }
      this.sendToClient(client, message);
    });
  }

  // Public methods for broadcasting appointment events
  broadcastAppointmentCreated(appointment: any, excludeUserId?: string) {
    const message: WebSocketMessage = {
      type: 'appointment_created',
      data: {
        appointmentId: appointment.id,
        doctorId: appointment.doctorId,
        date: appointment.date,
        startTime: appointment.startTime,
        endTime: appointment.endTime,
        patientId: appointment.patientId
      },
      timestamp: Date.now()
    };

    this.broadcast(message, excludeUserId);
    
    // Also broadcast slot availability update
    this.broadcastSlotAvailabilityUpdate({
      doctorId: appointment.doctorId,
      date: appointment.date.toISOString().split('T')[0],
      timeSlot: appointment.startTime,
      isAvailable: false,
      appointmentId: appointment.id
    }, excludeUserId);

    logger.info(`Broadcasted appointment created: ${appointment.id}`);
  }

  broadcastAppointmentCancelled(appointment: any, excludeUserId?: string) {
    const message: WebSocketMessage = {
      type: 'appointment_cancelled',
      data: {
        appointmentId: appointment.id,
        doctorId: appointment.doctorId,
        date: appointment.date,
        startTime: appointment.startTime,
        endTime: appointment.endTime
      },
      timestamp: Date.now()
    };

    this.broadcast(message, excludeUserId);

    // Also broadcast slot availability update
    this.broadcastSlotAvailabilityUpdate({
      doctorId: appointment.doctorId,
      date: appointment.date.toISOString().split('T')[0],
      timeSlot: appointment.startTime,
      isAvailable: true
    }, excludeUserId);

    logger.info(`Broadcasted appointment cancelled: ${appointment.id}`);
  }

  broadcastAppointmentStatusChanged(appointment: any, oldStatus: string, newStatus: string, excludeUserId?: string) {
    const message: WebSocketMessage = {
      type: 'appointment_status_changed',
      data: {
        appointmentId: appointment.id,
        doctorId: appointment.doctorId,
        date: appointment.date,
        startTime: appointment.startTime,
        oldStatus,
        newStatus
      },
      timestamp: Date.now()
    };

    this.broadcast(message, excludeUserId);
    logger.info(`Broadcasted appointment status changed: ${appointment.id} (${oldStatus} -> ${newStatus})`);
  }

  broadcastSlotAvailabilityUpdate(slotUpdate: SlotAvailabilityUpdate, excludeUserId?: string) {
    const message: WebSocketMessage = {
      type: 'slot_availability_update',
      data: slotUpdate,
      timestamp: Date.now()
    };

    this.broadcast(message, excludeUserId);
    logger.info(`Broadcasted slot availability update: ${slotUpdate.doctorId} ${slotUpdate.date} ${slotUpdate.timeSlot} -> ${slotUpdate.isAvailable ? 'available' : 'unavailable'}`);
  }

  getConnectedClientsCount(): number {
    return this.clients.size;
  }
}

export const webSocketService = new WebSocketService();
export default webSocketService;