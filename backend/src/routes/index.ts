import { Router } from 'express';
import authRoutes from './auth.routes';
import doctorRoutes from './doctor.routes';
import scheduleRoutes from './schedule.routes';
import appointmentRoutes from './appointment.routes';
import medicalRoutes from './medical.routes';
import analyticsRoutes from './analytics.routes';
import userRoutes from './user.routes';

const api = Router();

api.use('/auth', authRoutes);
api.use('/doctors', doctorRoutes);
api.use('/schedules', scheduleRoutes);
api.use('/appointments', appointmentRoutes);
api.use('/medical-records', medicalRoutes);
api.use('/analytics', analyticsRoutes);
api.use('/users', userRoutes);

export default api;
