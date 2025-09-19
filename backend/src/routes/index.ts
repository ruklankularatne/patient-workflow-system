import { Router } from 'express';
import authRoutes from './auth.routes';

const api = Router();
api.use('/auth', authRoutes);

export default api;
