import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'prisma/prisma.service';
import { EmailService } from './email.service';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { LoginDto } from './dto/login.dto';
import { Prisma } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { users } from '@prisma/client';
import { JwtPayload } from 'jsonwebtoken';
import { ProfilePictureUrl } from 'src/common/assets/UserProfilePic';
import { ResetPasswordDto } from './dto/resetPassword.dto';
import { CompleteProfileDto } from './dto/complete_profile.dto';

export enum ProviderType {
  LOCAL = 'local',
  GOOGLE = 'google',
}

@Injectable()
export class AuthenticationService {
  private readonly saltOrRounds = 10;

  constructor(
    private readonly prisma: PrismaService,
    private readonly authEmailService: EmailService,
    private cloudinaryService: CloudinaryService,
    private jwtService: JwtService,
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

    let profilePictureUrl: string = ProfilePictureUrl;
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
      username = await this.generateUsername();
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

    return { token: await this.generateToken(user) };
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

    if (!credentials) {
      throw new BadRequestException('Login with google');
    }
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

    return { token: await this.generateToken(user) };
  }

  async resetPasswordRequest(email: string) {
    const user = await this.prisma.users.findUnique({
      where: { email },
      include: {
        local_credentials: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.local_credentials || !user.local_credentials.email_verified) {
      throw new HttpException('User not found or inactive', 404);
    }

    const { expired_code_at, verifictionCode: reset_code } =
      this.getVerificationCode();
    await this.authEmailService.sendResetPasswordEmail(email, reset_code);

    const updated = await this.prisma.local_credentials.update({
      where: { user_id: user.id },
      data: {
        verification_code: reset_code,
        verification_code_expires_at: expired_code_at,
      },
    });

    if (!updated) {
      throw new InternalServerErrorException('Failed to set reset token');
    }
    return 'Reset password email sent';
  }

  async checkPasswordResetCode({
    email,
    code,
  }: {
    email: string;
    code: string | number;
  }) {
    const user = await this.prisma.users.findUnique({
      where: { email },
      include: {
        local_credentials: true,
      },
    });

    if (!user || !user.local_credentials) {
      throw new NotFoundException('User not found');
    }

    const credential = user.local_credentials;
    if (
      credential.verification_code !== String(code) ||
      !(
        credential.verification_code_expires_at &&
        credential.verification_code_expires_at.getTime() > new Date().getTime()
      )
    ) {
      throw new BadRequestException('Invalid or expired code');
    }

    await this.prisma.local_credentials.update({
      where: { user_id: user.id },
      data: {
        verification_code_expires_at: null,
        reset_verified: true,
      },
    });
    return { message: 'Valid reset code' };
  }

  async resetPassword(body: ResetPasswordDto) {
    const { email, new_password, confirm_password, code } = body;

    if (new_password !== confirm_password) {
      throw new BadRequestException('Passwords do not match');
    }

    const user = await this.prisma.users.findUnique({
      where: { email },
      include: {
        local_credentials: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const credential = user.local_credentials;
    if (!credential || !credential.reset_verified) {
      throw new BadRequestException('Password reset not verified');
    }

    if (credential.verification_code !== String(code)) {
      throw new BadRequestException('Invalid reset code');
    }

    const hashedPassword = await bcrypt.hash(new_password, this.saltOrRounds);

    try {
      await this.prisma.local_credentials.update({
        where: { user_id: user.id },
        data: {
          password_hash: hashedPassword,
          reset_verified: false,
          verification_code: null,
        },
      });
    } catch {
      throw new InternalServerErrorException('Failed to reset password');
    }

    return 'Password has been reset successfully';
  }

  async generateToken(user: users) {
    const payload: JwtPayload = {
      id: user.id,
      email: user.email,
      username: user.username,
      type: user.type,
    };
    const token = await this.jwtService.signAsync(payload);
    return token;
  }

  async googleCallback(user: users) {
    if (!user.isprofilecomplete) {
      return {
        requiresProfileCompletion: true,
        userId: user.id,
        email: user.email,
      };
    }

    return {
      requiresProfileCompletion: false,
      accessToken: await this.generateToken(user),
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        userType: user.type,
      },
    };
  }

  async completeProfile(dto: CompleteProfileDto) {
    const { id, type } = dto;
    const existingUser = await this.prisma.users.findUnique({
      where: { id },
    });

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    if (existingUser.isprofilecomplete) {
      throw new BadRequestException('Profile already completed');
    }
    let username = dto.username;

    if (!username) username = await this.generateUsername();
    const user = await this.prisma.users.update({
      where: { id },
      data: {
        type,
        username,
        isprofilecomplete: true,
      },
    });

    return {
      token: await this.generateToken(user),
    };
  }

  getVerificationCode() {
    const verifictionCode = Math.floor(
      100000 + Math.random() * 900000,
    ).toString();
    const expired_code_at = new Date(Date.now() + 10 * 60 * 1000);

    return { verifictionCode, expired_code_at };
  }

  async generateUsername() {
    // Get next sequence value
    const result = await this.prisma.$queryRaw<
      Array<{
        nextval: number;
      }>
    >`SELECT nextval('username_seq')`;
    return `user${result[0].nextval}`;
  }
}
