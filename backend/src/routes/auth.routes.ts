import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { PrismaClient, Role } from '@prisma/client';
import { generateTokens, verifyRefreshToken, verifyAccessToken, COOKIE_CONFIG } from '../utils/jwt.js';
import { logger } from '../utils/logger.js';
import { logCreate } from '../audit/audit.service.js';

const router = Router();
const prisma = new PrismaClient();

// Validation schemas
const RegisterSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .regex(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, 'Please enter a valid email address'),
  fullName: z.string()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name must be less than 100 characters'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  role: z.enum(['patient']).default('patient') // Only patients can register
});

const LoginSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .regex(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, 'Please enter a valid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
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

    // Find user 
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        doctor: true // Include doctor relationship
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
      data: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        doctorId: user.doctor?.id, // Add doctorId for doctor users
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
        doctor: true // Include doctor relationship
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
      data: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        doctorId: user.doctor?.id, // Add doctorId for doctor users
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
router.get('/me', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies[COOKIE_CONFIG.accessToken.name];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }

    // Use the JWT verification utility
    const payload = verifyAccessToken(token);

    // Get user data from database
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        doctor: true // Include doctor relationship for doctor users
      }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User not found or inactive'
      });
    }

    return res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        createdAt: user.createdAt,
        doctorId: user.doctor?.id, // Add doctorId for doctor users
      }
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
});

/**
 * Debug authentication status
 * GET /auth/debug
 */
router.get('/debug', async (req: Request, res: Response) => {
  const accessToken = req.cookies[COOKIE_CONFIG.accessToken.name];
  const refreshToken = req.cookies[COOKIE_CONFIG.refreshToken.name];
  
  return res.json({
    success: true,
    data: {
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
      accessTokenLength: accessToken ? accessToken.length : 0,
      cookies: req.cookies,
      headers: req.headers
    }
  });
});

export default router;
