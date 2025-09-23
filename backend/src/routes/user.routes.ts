import { Router } from 'express';
import { requireAuth, requireRole } from '../middlewares/auth';
import { PrismaClient } from '@prisma/client';
import { createUser } from '../services/auth.service';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();
const router = Router();

// Get all users (admin only)
router.get('/', requireAuth, requireRole('admin', 'superadmin'), async (_req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      }
    });
    
    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Error fetching users');
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users'
    });
  }
});

// Create admin user (superadmin only)
router.post('/create-admin', requireAuth, requireRole('superadmin'), async (req, res) => {
  try {
    const { email, fullName, password } = req.body;
    const actorId = (req as any).user?.id;
    
    logger.info(`Superadmin ${actorId} attempting to create admin user: ${email}`);
    
    if (!email || !fullName || !password) {
      logger.warn(`Admin creation failed - missing fields for user: ${email}`);
      return res.status(400).json({
        success: false,
        message: 'Email, full name, and password are required'
      });
    }
    
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      logger.warn(`Admin creation failed - email already exists: ${email}`);
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }
    
    const adminUser = await createUser({
      email,
      fullName,
      password,
      role: 'admin'
    });
    
    logger.info(`Admin user created successfully: ${email} by superadmin: ${actorId}`);
    
    res.json({
      success: true,
      data: {
        id: adminUser.id,
        email: adminUser.email,
        fullName: adminUser.fullName,
        role: adminUser.role,
        createdAt: adminUser.createdAt
      },
      message: 'Admin user created successfully'
    });
  } catch (error: any) {
    logger.error('Error creating admin user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create admin user'
    });
  }
});

// Get user by ID (admin only)
router.get('/:id', requireAuth, requireRole('admin', 'superadmin'), async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      }
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Error fetching user');
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user'
    });
  }
});

// Update user (admin only)
router.put('/:id', requireAuth, requireRole('admin', 'superadmin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { role, fullName, email } = req.body;
    
    // Don't allow changing superadmin role
    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (existingUser?.role === 'superadmin' && role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Cannot change superadmin role'
      });
    }
    
    const updateData: any = {};
    if (role) updateData.role = role;
    if (fullName) updateData.fullName = fullName;
    if (email) updateData.email = email;
    
    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      }
    });
    
    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Error updating user');
    res.status(500).json({
      success: false,
      message: 'Failed to update user'
    });
  }
});

// Delete user (admin only)
router.delete('/:id', requireAuth, requireRole('admin', 'superadmin'), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Don't allow deleting superadmin
    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (existingUser?.role === 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete superadmin user'
      });
    }
    
    await prisma.user.delete({ where: { id } });
    
    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Error deleting user');
    res.status(500).json({
      success: false,
      message: 'Failed to delete user'
    });
  }
});

export default router;