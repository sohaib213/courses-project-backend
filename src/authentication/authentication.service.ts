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
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';

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
    const { email, password, confirm_password, type, username } = dto;

    const existingUser = await this.prisma.users.findUnique({
      where: {
        email: email,
      },
    });

    if (existingUser) {
      throw new BadRequestException('User already exists');
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

    const newUser = await this.prisma.users.create({
      data: {
        email: email,
        username: username || 'User',
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

    if (!newUser) {
      throw new InternalServerErrorException('Failed to create user');
    }
    await this.authEmailService.sendVerificationEmail(email, verifictionCode);

    return {
      id: newUser.id,
      email,
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
  // signIn() {
  //   const { email, password } = req.body;

  //   const result = await prisma.users.findUnique({
  //     where: { email: email },
  //     include: { credentials: true },
  //   });

  //   if (!result) {
  //     return next(
  //       appError.create('Invalid email or password', 401, httpStatusText.FAIL),
  //     );
  //   }
  //   const passwordMatch = await bcrypt.compare(
  //     password,
  //     result.credentials.password_hash,
  //   );

  //   if (!passwordMatch) {
  //     return next(
  //       appError.create('Invalid email or password', 401, httpStatusText.FAIL),
  //     );
  //   }

  //   if (result.credentials.status !== 'active') {
  //     const { expired_code_at, verifictionCode } = getVerificationCode();

  //     await prisma.credentials.update({
  //       where: { user_id: result.id },
  //       data: {
  //         verification_code: verifictionCode,
  //         code_expires_at: expired_code_at,
  //       },
  //     });

  //     await sendVerificationEmail(email, verifictionCode);
  //     return next(
  //       appError.create('Please Verify Email', 400, httpStatusText.FAIL),
  //     );
  //   }

  //   const token = tokenMiddleware.generateToken(result);

  //   return res.status(200).json({
  //     status: httpStatusText.SUCCESS,
  //     data: {
  //       access_token: token,
  //       // refresh_token: token
  //     },
  //   });
  // }
}
