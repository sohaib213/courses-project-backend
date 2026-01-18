import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'prisma/prisma.service';
import { EmailService } from './email.service';
import { generateToken } from './utils/jwt.helpers';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { LoginDto } from './dto/login.dto';
import { Prisma } from '@prisma/client';

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
    private cloudinaryService: CloudinaryService,
  ) {}
  async Register(dto: RegisterDto, file?: Express.Multer.File) {
    const { email, password, confirm_password, type } = dto;

    const existingUser = await this.prisma.users.findUnique({
      where: {
        email: email,
      },
    });

    if (existingUser) {
      throw new ConflictException('User already exists');
    }

    // Upload profile picture if provided
    let profilePictureUrl: string =
      'https://res.cloudinary.com/dspfo4tsu/image/upload/v1758482809/pp-removebg-preview_ynlgkr.png';
    if (file) {
      try {
        const result = await this.cloudinaryService.uploadFile(
          file,
          'users/profiles',
        );
        profilePictureUrl = result.secure_url;
      } catch {
        throw new BadRequestException('Failed to upload profile picture');
      }
    }

    if (password !== confirm_password) {
      throw new BadRequestException('Passwords do not match');
    }

    const hashedPassword = await bcrypt.hash(password, this.saltOrRounds);

    const { expired_code_at, verifictionCode } = this.getVerificationCode();

    let username = dto.username;
    if (!username) {
      // Get next sequence value
      const result = await this.prisma.$queryRaw<
        Array<{
          nextval: number;
        }>
      >`SELECT nextval('username_seq')`;
      username = `user${result[0].nextval}`;
    }
    let newUser;
    try {
      newUser = await this.prisma.users.create({
        data: {
          email: email,
          username,
          type: type,
          provider: ProviderType.LOCAL,
          image: profilePictureUrl,
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
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Username already exists');
      } else {
        throw new InternalServerErrorException('Failed to create user');
      }
    }

    await this.authEmailService.sendVerificationEmail(email, verifictionCode);

    return {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      id: newUser.id,
      email,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      username: newUser.username,
      type,
      image: profilePictureUrl,
      provider: ProviderType.LOCAL,
    };
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
  async Login(dto: LoginDto) {
    const { email, password } = dto;

    const user = await this.prisma.users.findUnique({
      where: { email: email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const credentials = await this.prisma.local_credentials.findUnique({
      where: { user_id: user.id },
    });

    const passwordMatch = await bcrypt.compare(
      password,
      credentials.password_hash,
    );

    if (!passwordMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!credentials.email_verified) {
      const { expired_code_at, verifictionCode } = this.getVerificationCode();

      await this.prisma.local_credentials.update({
        where: { user_id: user.id },
        data: {
          verification_code: verifictionCode,
          verification_code_expires_at: expired_code_at,
        },
      });

      await this.authEmailService.sendVerificationEmail(email, verifictionCode);
      throw new UnauthorizedException('Please Verify Email');
    }

    const token = generateToken(user);

    return { token };
  }
}
