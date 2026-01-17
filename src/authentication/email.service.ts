// src/authentication/email.service.ts
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter<SMTPTransport.SentMessageInfo>;

  constructor(private configService: ConfigService) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: this.configService.get<string>('EMAIL_USER'),
        pass: this.configService.get<string>('EMAIL_PASS'),
      },
    });
  }

  // Send verification code
  async sendVerificationEmail(to: string, code: string) {
    const mailOptions = {
      from: `"${process.env.APP_NAME}" <${process.env.APP_NAME}>`,
      to,
      subject: 'Your verification code',
      html: `
        <h2>Welcome!</h2>
        <p>Enter the code below to verify your email:</p>
        <h1>${code}</h1>
        <p>This code will expire in 10 minutes.</p>
      `,
    };

    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      return await this.transporter.sendMail(mailOptions);
    } catch {
      throw new InternalServerErrorException(
        'Failed to send verification email.',
      );
    }
  }

  // Send reset password email
  async sendResetPasswordEmail(to: string, code: string) {
    const mailOptions = {
      from: `"${process.env.APP_NAME}" <${process.env.EMAIL_USER}>`,
      to,
      subject: 'Reset your password',
      html: `
        <h2>Welcome</h2>
        <p>Enter the code below to reset your password:</p>
        <h1>${code}</h1>
        <p>This code will expire in 10 minutes.</p>
      `,
    };
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      return await this.transporter.sendMail(mailOptions);
    } catch {
      throw new InternalServerErrorException(
        'Failed to send reset password email.',
      );
    }
  }
}
