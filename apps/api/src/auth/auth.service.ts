import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private mailService: MailService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.email }, { username: dto.username }] },
    });
    if (existing) {
      throw new ConflictException(
        existing.email === dto.email ? 'Email already in use' : 'Username already taken',
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const emailVerifyToken = uuidv4();

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        username: dto.username,
        displayName: dto.displayName,
        passwordHash,
        emailVerifyToken,
      },
      select: { id: true, email: true, username: true, displayName: true },
    });

    await this.mailService.sendVerificationEmail(user.email, emailVerifyToken);

    return { message: 'Registration successful. Please verify your email.', userId: user.id };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    return this.generateTokens(user.id, user.email);
  }

  async refreshToken(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    return this.generateTokens(user.id, user.email);
  }

  async verifyEmail(token: string) {
    const user = await this.prisma.user.findFirst({ where: { emailVerifyToken: token } });
    if (!user) throw new BadRequestException('Invalid or expired verification token');
    await this.prisma.user.update({
      where: { id: user.id },
      data: { isEmailVerified: true, emailVerifyToken: null },
    });
    return { message: 'Email verified successfully' };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return { message: 'If the email exists, a reset link was sent.' };

    const token = uuidv4();
    const expiry = new Date(Date.now() + 3600 * 1000);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordResetToken: token, passwordResetExpiry: expiry },
    });

    await this.mailService.sendPasswordResetEmail(email, token);
    return { message: 'If the email exists, a reset link was sent.' };
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpiry: { gt: new Date() },
      },
    });
    if (!user) throw new BadRequestException('Invalid or expired reset token');

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, passwordResetToken: null, passwordResetExpiry: null },
    });
    return { message: 'Password reset successfully' };
  }

  async googleLogin(googleUser: { googleId: string; email: string; displayName: string; avatarUrl?: string }) {
    let user = await this.prisma.user.findFirst({
      where: { OR: [{ googleId: googleUser.googleId }, { email: googleUser.email }] },
    });

    if (!user) {
      const username = await this.generateUniqueUsername(googleUser.email.split('@')[0]);
      user = await this.prisma.user.create({
        data: {
          email: googleUser.email,
          username,
          displayName: googleUser.displayName,
          avatarUrl: googleUser.avatarUrl,
          googleId: googleUser.googleId,
          isEmailVerified: true,
        },
      });
    } else if (!user.googleId) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { googleId: googleUser.googleId },
      });
    }

    return this.generateTokens(user.id, user.email);
  }

  private async generateTokens(userId: string, email: string) {
    const payload = { sub: userId, email };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('JWT_SECRET'),
        expiresIn: this.configService.get('JWT_EXPIRES_IN') || '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN') || '30d',
      }),
    ]);
    return { accessToken, refreshToken };
  }

  private async generateUniqueUsername(base: string): Promise<string> {
    const sanitized = base.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase().slice(0, 20);
    let username = sanitized || 'user';
    let counter = 0;
    while (await this.prisma.user.findUnique({ where: { username } })) {
      counter++;
      username = `${sanitized}${counter}`;
    }
    return username;
  }
}
