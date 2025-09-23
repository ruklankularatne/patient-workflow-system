'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

// Simple logger for development
const logger = {
  info: (...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[WebSocket]', ...args);
    }
  },
  warn: (...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[WebSocket]', ...args);
    }
  },
  error: (...args: any[]) => {
    console.error('[WebSocket]', ...args);
  }
};

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

interface UseWebSocketOptions {
  onAppointmentCreated?: (data: any) => void;
  onAppointmentCancelled?: (data: any) => void;
  onAppointmentStatusChanged?: (data: any) => void;
  onSlotAvailabilityUpdate?: (data: SlotAvailabilityUpdate) => void;
  autoReconnect?: boolean;
  reconnectInterval?: number;
  userId?: string; // Add userId parameter
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const {
    onAppointmentCreated,
    onAppointmentCancelled,
    onAppointmentStatusChanged,
    onSlotAvailabilityUpdate,
    autoReconnect = true,
    reconnectInterval = 3000,
    userId
  } = options;

  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  // Store callbacks in refs to avoid dependency issues
  const callbacksRef = useRef({
    onAppointmentCreated,
    onAppointmentCancelled,
    onAppointmentStatusChanged,
    onSlotAvailabilityUpdate
  });

  // Update callbacks when they change
  useEffect(() => {
    callbacksRef.current = {
      onAppointmentCreated,
      onAppointmentCancelled,
      onAppointmentStatusChanged,
      onSlotAvailabilityUpdate
    };
  }, [onAppointmentCreated, onAppointmentCancelled, onAppointmentStatusChanged, onSlotAvailabilityUpdate]);

  const connect = useCallback(() => {
    if (!mountedRef.current || wsRef.current?.readyState === WebSocket.OPEN) {
      return; // Component unmounted or already connected
    }

    try {
      setConnectionStatus('connecting');
      const wsUrl = process.env.NODE_ENV === 'production' 
        ? `wss://${window.location.host}/ws/appointments`
        : 'ws://localhost:8080/ws/appointments';
      
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        if (!mountedRef.current) return;
        setConnectionStatus('connected');
        logger.info('WebSocket connected for real-time appointment updates');
        
        // Send user identification if provided
        if (userId) {
          wsRef.current?.send(JSON.stringify({
            type: 'identify',
            userId: userId
          }));
          logger.info('Sent user identification:', userId);
        }
        
        // Clear any existing reconnect timeout
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };

      wsRef.current.onmessage = (event) => {
        if (!mountedRef.current) return;
        
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          setLastMessage(message);

          // Route messages to appropriate handlers using refs
          const callbacks = callbacksRef.current;
          switch (message.type) {
            case 'appointment_created':
              callbacks.onAppointmentCreated?.(message.data);
              break;
            case 'appointment_cancelled':
              callbacks.onAppointmentCancelled?.(message.data);
              break;
            case 'appointment_status_changed':
              callbacks.onAppointmentStatusChanged?.(message.data);
              break;
            case 'slot_availability_update':
              callbacks.onSlotAvailabilityUpdate?.(message.data);
              break;
            default:
              logger.info('Received WebSocket message:', message);
          }
        } catch (error) {
          logger.error('Error parsing WebSocket message:', error);
        }
      };

      wsRef.current.onclose = (event) => {
        if (!mountedRef.current) return;
        setConnectionStatus('disconnected');
        logger.info('WebSocket disconnected:', event.code, event.reason);

        // Attempt to reconnect if autoReconnect is enabled and no timeout is pending
        if (autoReconnect && !reconnectTimeoutRef.current) {
          reconnectTimeoutRef.current = setTimeout(() => {
            if (mountedRef.current) {
              logger.info('Attempting to reconnect WebSocket...');
              reconnectTimeoutRef.current = null;
              connect();
            }
          }, reconnectInterval);
        }
      };

      wsRef.current.onerror = (error) => {
        if (!mountedRef.current) return;
        setConnectionStatus('error');
        logger.error('WebSocket error:', error);
      };

    } catch (error) {
      if (!mountedRef.current) return;
      setConnectionStatus('error');
      logger.error('Failed to create WebSocket connection:', error);
    }
  }, [autoReconnect, reconnectInterval, userId]); // Add userId to dependencies

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (mountedRef.current) {
      setConnectionStatus('disconnected');
    }
  }, []);

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      logger.warn('Cannot send message: WebSocket is not connected');
    }
  }, []);

  // Subscribe to specific doctor updates
  const subscribeToDoctor = useCallback((doctorId: string) => {
    sendMessage({
      type: 'subscribe_to_doctor',
      doctorId
    });
  }, [sendMessage]);

  // Auto-connect on mount
  useEffect(() => {
    mountedRef.current = true;
    connect();
    
    // Cleanup on unmount
    return () => {
      mountedRef.current = false;
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    connectionStatus,
    lastMessage,
    connect,
    disconnect,
    sendMessage,
    subscribeToDoctor,
    isConnected: connectionStatus === 'connected'
  };
}

// Utility hook for appointment slot availability updates
export function useSlotAvailability(userId?: string) {
  const [slotUpdates, setSlotUpdates] = useState<Map<string, SlotAvailabilityUpdate>>(new Map());

  // Use useCallback to prevent infinite re-renders
  const handleSlotUpdate = useCallback((data: SlotAvailabilityUpdate) => {
    const key = `${data.doctorId}-${data.date}-${data.timeSlot}`;
    setSlotUpdates(prev => new Map(prev.set(key, data)));
  }, []);

  const { connectionStatus, subscribeToDoctor } = useWebSocket({
    onSlotAvailabilityUpdate: handleSlotUpdate,
    userId
  });

  const getSlotAvailability = useCallback((doctorId: string, date: string, timeSlot: string): boolean | null => {
    const key = `${doctorId}-${date}-${timeSlot}`;
    const update = slotUpdates.get(key);
    return update ? update.isAvailable : null;
  }, [slotUpdates]);

  const clearSlotUpdates = useCallback(() => {
    setSlotUpdates(new Map());
  }, []);

  return {
    slotUpdates,
    getSlotAvailability,
    clearSlotUpdates,
    subscribeToDoctor,
    isConnected: connectionStatus === 'connected'
  };
}