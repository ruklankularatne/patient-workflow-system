import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { PrismaClient, Role } from '@prisma/client';
import { generateTokens, verifyRefreshToken, COOKIE_CONFIG } from '../utils/jwt.js';
import { logger } from '../utils/logger.js';
import { logCreate } from '../audit/audit.service.js';

const router = Router();
const prisma = new PrismaClient();

// Validation schemas
const RegisterSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1),
  password: z.string().min(8),
  role: z.enum(['superadmin', 'admin', 'doctor', 'patient']).default('patient')
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

/**
 * Register a new user
 * POST /auth/register
 */
router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = RegisterSchema.parse(req.body);
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: body.email }
    });
    
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Email already registered'
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(body.password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: body.email,
        fullName: body.fullName,
        passwordHash,
        role: body.role as Role,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        createdAt: true,
      }
    });

    // Log user creation
    await logCreate('User', user.id, user, req);

    logger.info(`User registered: ${user.email}`);

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors
      });
    }
    return next(error);
  }
});

/**
 * Login user
 * POST /auth/login
 */
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = LoginSchema.parse(req.body);

    // Find user with doctor relation
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        Doctor: true,
      }
    });

    if (!user) {
      logger.warn(`Login attempt with non-existent email: ${email}`);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    if (!user.isActive) {
      logger.warn(`Login attempt with inactive account: ${email}`);
      return res.status(401).json({
        success: false,
        message: 'Account is inactive'
      });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      logger.warn(`Invalid password attempt for: ${email}`);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate tokens
    const tokens = generateTokens({
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    });

    // Set HTTP-only cookies
    res.cookie(
      COOKIE_CONFIG.accessToken.name,
      tokens.accessToken,
      COOKIE_CONFIG.accessToken.options
    );
    
    res.cookie(
      COOKIE_CONFIG.refreshToken.name,
      tokens.refreshToken,
      COOKIE_CONFIG.refreshToken.options
    );

    logger.info(`User logged in: ${user.email}`);

    return res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        doctorId: user.Doctor?.id,
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors
      });
    }
    return next(error);
  }
});

/**
 * Refresh access token
 * POST /auth/refresh
 */
router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const refreshToken = req.cookies[COOKIE_CONFIG.refreshToken.name];
    
    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token not provided'
      });
    }

    // Verify refresh token
    const payload = verifyRefreshToken(refreshToken);

    // Get user data
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        Doctor: true,
      }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }

    // Generate new access token
    const tokens = generateTokens({
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    });

    // Set new access token cookie
    res.cookie(
      COOKIE_CONFIG.accessToken.name,
      tokens.accessToken,
      COOKIE_CONFIG.accessToken.options
    );

    logger.info(`Token refreshed for user: ${user.email}`);

    return res.json({
      success: true,
      message: 'Token refreshed successfully',
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        doctorId: user.Doctor?.id,
      }
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid refresh token'
    });
  }
});

/**
 * Logout user
 * POST /auth/logout
 */
router.post('/logout', async (req: Request, res: Response) => {
  // Clear cookies
  res.clearCookie(COOKIE_CONFIG.accessToken.name, {
    path: '/',
    secure: COOKIE_CONFIG.accessToken.options.secure,
    sameSite: COOKIE_CONFIG.accessToken.options.sameSite,
  });
  
  res.clearCookie(COOKIE_CONFIG.refreshToken.name, {
    path: '/',
    secure: COOKIE_CONFIG.refreshToken.options.secure,
    sameSite: COOKIE_CONFIG.refreshToken.options.sameSite,
  });

  logger.info('User logged out');

  return res.json({
    success: true,
    message: 'Logout successful'
  });
});

/**
 * Get current user profile
 * GET /auth/me
 */
router.get('/me', async (req: Request, res: Response) => {
  try {
    const token = req.cookies[COOKIE_CONFIG.accessToken.name];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }

    // This route can be used to verify if user is still logged in
    // The actual user data would be added by auth middleware
    return res.json({
      success: true,
      message: 'User is authenticated',
      authenticated: true
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
});

export default router;
