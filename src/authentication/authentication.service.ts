import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'prisma/prisma.service';
import { EmailService } from './email.service';
import { generateToken } from './utils/jwt.helpers';

export enum ProviderType {
  LOCAL = 'local',
  GOOGLE = 'google',
  // add other providers if needed
}

@Injectable()
export class AuthenticationService {
  private readonly saltOrRounds = 10;

  constructor(
    private readonly prisma: PrismaService,
    private readonly authEmailService: EmailService,
  ) {}
  async Register(dto: RegisterDto) {
    const { email, password, confirm_password, type, username } = dto;

    if (password !== confirm_password) {
      throw new BadRequestException('Passwords do not match');
    }

    const hashedPassword = await bcrypt.hash(password, this.saltOrRounds);

    const { expired_code_at, verifictionCode } = this.getVerificationCode();

    const newUser = await this.prisma.users.create({
      data: {
        email: email,
        username: username || 'User',
        type: type,
        provider: ProviderType.LOCAL,
        local_credentials: {
          create: {
            password_hash: hashedPassword,
            verification_code: verifictionCode,
            verification_code_expires_at: expired_code_at,
          },
        },
      },
      include: { local_credentials: true },
    });

    if (!newUser) {
      throw new InternalServerErrorException('Failed to create user');
    }
    await this.authEmailService.sendVerificationEmail(email, verifictionCode);

    return newUser;
  }

  getVerificationCode() {
    const verifictionCode = Math.floor(
      100000 + Math.random() * 900000,
    ).toString();
    const expired_code_at = new Date(Date.now() + 10 * 60 * 1000);

    return { verifictionCode, expired_code_at };
  }
  async verifyEmail(body: { email: string; code: string | number }) {
    const { email, code } = body;

    const user = await this.prisma.users.findUnique({
      where: { email },
      include: {
        local_credentials: {
          where: {
            verification_code: String(code),
          },
        },
      },
    });

    if (!user || !user.local_credentials) {
      throw new BadRequestException('Invalid email or code');
    }

    const expirationTime = user.local_credentials.verification_code_expires_at;

    if (!(expirationTime && expirationTime.getTime() > new Date().getTime())) {
      const { expired_code_at, verifictionCode } = this.getVerificationCode();

      await this.prisma.local_credentials.update({
        where: { user_id: user.id },
        data: {
          verification_code: verifictionCode,
          verification_code_expires_at: expired_code_at,
        },
      });
      await this.authEmailService.sendVerificationEmail(email, verifictionCode);

      throw new BadRequestException('Code has expired chek the new code');
    }

    await this.prisma.local_credentials.update({
      where: { user_id: user.id },
      data: {
        email_verified: true,
        verification_code: null,
        verification_code_expires_at: null,
      },
    });

    const token = generateToken(user);

    return {
      access_token: token,
    };
  }
}
