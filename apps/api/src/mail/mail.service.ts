import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('SMTP_HOST'),
      port: this.configService.get<number>('SMTP_PORT') || 587,
      secure: false,
      auth: {
        user: this.configService.get('SMTP_USER'),
        pass: this.configService.get('SMTP_PASS'),
      },
    });
  }

  async sendVerificationEmail(email: string, token: string) {
    const url = `${this.configService.get('NEXT_PUBLIC_APP_URL')}/auth/verify-email?token=${token}`;
    await this.send(email, 'Verify your ExpenseFlow email', `
      <h2>Welcome to ExpenseFlow! 💸</h2>
      <p>Please verify your email address by clicking the link below:</p>
      <a href="${url}" style="background:#22c55e;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;">Verify Email</a>
      <p>This link expires in 24 hours.</p>
    `);
  }

  async sendPasswordResetEmail(email: string, token: string) {
    const url = `${this.configService.get('NEXT_PUBLIC_APP_URL')}/auth/reset-password?token=${token}`;
    await this.send(email, 'Reset your ExpenseFlow password', `
      <h2>Password Reset Request</h2>
      <p>Click the link below to reset your password:</p>
      <a href="${url}" style="background:#22c55e;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;">Reset Password</a>
      <p>This link expires in 1 hour. If you didn't request this, please ignore this email.</p>
    `);
  }

  async sendGroupInviteEmail(email: string, inviterName: string, groupName: string, token: string) {
    const url = `${this.configService.get('NEXT_PUBLIC_APP_URL')}/friends/invite/${token}`;
    await this.send(email, `${inviterName} invited you to ${groupName} on ExpenseFlow`, `
      <h2>You've been invited! 🎉</h2>
      <p>${inviterName} has invited you to join <strong>${groupName}</strong> on ExpenseFlow.</p>
      <a href="${url}" style="background:#22c55e;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;">Accept Invitation</a>
    `);
  }

  private async send(to: string, subject: string, html: string) {
    try {
      await this.transporter.sendMail({
        from: this.configService.get('EMAIL_FROM') || 'noreply@expenseflow.app',
        to,
        subject,
        html,
      });
    } catch (err) {
      this.logger.error(`Failed to send email to ${to}: ${err}`);
    }
  }
}
