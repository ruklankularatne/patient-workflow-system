import { Router } from 'express';
import authRoutes from './auth.routes';
import doctorRoutes from './doctor.routes';
import scheduleRoutes from './schedule.routes';

const api = Router();

api.use('/auth', authRoutes);
api.use('/doctors', doctorRoutes);
api.use('/schedules', scheduleRoutes);

export default api;
