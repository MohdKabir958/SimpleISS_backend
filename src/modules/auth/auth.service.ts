import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../../config/database';
import { config } from '../../config/env';
import { logger } from '../../config/logger';
import { JwtPayload } from '../../shared/types/interfaces';
import { Role } from '../../shared/types/enums';
import { AuthenticationError } from '../../shared/errors/AuthenticationError';
import { NotFoundError } from '../../shared/errors/NotFoundError';
import { LoginInput } from './auth.validator';

export class AuthService {
  async login(input: LoginInput): Promise<{ accessToken: string; refreshToken: string; user: object }> {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
      include: { restaurant: true },
    });

    if (!user || !user.isActive) {
      logger.warn('Login attempt with invalid credentials', { email: input.email });
      throw new AuthenticationError('Invalid email or password', 'AUTH_INVALID_CREDENTIALS');
    }

    const isPasswordValid = await bcrypt.compare(input.password, user.password);

    if (!isPasswordValid) {
      logger.warn('Login attempt with wrong password', { email: input.email });
      throw new AuthenticationError('Invalid email or password', 'AUTH_INVALID_CREDENTIALS');
    }

    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role as Role,
      restaurantId: user.restaurantId,
    };

    const accessToken = this.generateAccessToken(payload);
    const refreshToken = this.generateRefreshToken(payload);

    // Store refresh token hash in database
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    logger.info('User logged in', { userId: user.id, role: user.role });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        restaurantId: user.restaurantId,
        restaurant: user.restaurant ? {
          id: user.restaurant.id,
          name: user.restaurant.name,
          slug: user.restaurant.slug,
        } : null,
      },
    };
  }

  async refreshToken(token: string): Promise<{ accessToken: string; refreshToken: string }> {
    if (!token) {
      throw new AuthenticationError('Refresh token not provided', 'AUTH_TOKEN_INVALID');
    }

    // Verify the token
    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(token, config.jwt.refreshSecret) as JwtPayload;
    } catch {
      throw new AuthenticationError('Invalid or expired refresh token', 'AUTH_TOKEN_EXPIRED');
    }

    // Check token hash in database
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const storedToken = await prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      throw new AuthenticationError('Refresh token is invalid or expired', 'AUTH_TOKEN_EXPIRED');
    }

    // Delete old token (rotate)
    await prisma.refreshToken.delete({ where: { id: storedToken.id } });

    // Verify user still exists and is active
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user || !user.isActive) {
      throw new AuthenticationError('User account is inactive', 'AUTH_TOKEN_INVALID');
    }

    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role as Role,
      restaurantId: user.restaurantId,
    };

    const newAccessToken = this.generateAccessToken(payload);
    const newRefreshToken = this.generateRefreshToken(payload);

    // Store new refresh token hash
    const newTokenHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: newTokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    logger.info('Token refreshed', { userId: user.id });

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }

  async logout(userId: string, refreshTokenValue?: string): Promise<void> {
    if (refreshTokenValue) {
      const tokenHash = crypto.createHash('sha256').update(refreshTokenValue).digest('hex');
      await prisma.refreshToken.deleteMany({ where: { tokenHash } });
    } else {
      // If no token, delete all refresh tokens for this user
      await prisma.refreshToken.deleteMany({ where: { userId } });
    }

    logger.info('User logged out', { userId });
  }

  async getMe(userId: string): Promise<object> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { restaurant: true },
    });

    if (!user) {
      throw new NotFoundError('User');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      restaurantId: user.restaurantId,
      restaurant: user.restaurant ? {
        id: user.restaurant.id,
        name: user.restaurant.name,
        slug: user.restaurant.slug,
        logo: user.restaurant.logo,
      } : null,
    };
  }

  private generateAccessToken(payload: JwtPayload): string {
    return jwt.sign(payload, config.jwt.accessSecret, {
      expiresIn: config.jwt.accessExpiresIn,
    });
  }

  private generateRefreshToken(payload: JwtPayload): string {
    return jwt.sign(payload, config.jwt.refreshSecret, {
      expiresIn: config.jwt.refreshExpiresIn,
    });
  }
}

/** Periodic job: remove expired refresh token rows (LOGIC-4) */
export async function cleanupExpiredRefreshTokens(): Promise<number> {
  const result = await prisma.refreshToken.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  return result.count;
}
