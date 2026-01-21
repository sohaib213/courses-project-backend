import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthenticationService } from './authentication.service';
import { RegisterDto } from './dto/register.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/resetPassword.dto';
import { GoogleAuthGuard } from './gurards/google-auth.guard';
import type { Response } from 'express';
import { CompleteProfileDto } from './dto/complete_profile.dto';
import { ImageFilePipe } from 'src/common/pipes/image-file.pipe';

@Controller('auth')
export class AuthenticationController {
  constructor(private readonly authenticationService: AuthenticationService) {}
  @Post('register')
  @UseInterceptors(FileInterceptor('profilePicture'))
  register(
    @Body() registerDto: RegisterDto,
    @UploadedFile(new ImageFilePipe(false))
    file?: Express.Multer.File,
  ) {
    return this.authenticationService.Register(registerDto, file);
  }
  @Post('verify')
  @HttpCode(HttpStatus.OK)
  verigyEmail(@Body() body: { email: string; code: string | number }) {
    return this.authenticationService.verifyEmail(body);
  }
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() body: LoginDto) {
    return this.authenticationService.Login(body);
  }
  @Post('request-password-reset')
  requestPasswordReset(@Body() body: { email: string }) {
    return this.authenticationService.resetPasswordRequest(body.email);
  }
  @Post('verify-reset-code')
  @HttpCode(HttpStatus.OK)
  verifyResetCode(@Body() body: { email: string; code: string | number }) {
    return this.authenticationService.checkPasswordResetCode(body);
  }
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() body: ResetPasswordDto) {
    return this.authenticationService.resetPassword(body);
  }
  @UseGuards(GoogleAuthGuard)
  @Get('google/login')
  googleLogin() {}

  @UseGuards(GoogleAuthGuard)
  @Get('google/callback')
  async googleAuthRedirect(@Req() req, @Res() res: Response) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    const result = await this.authenticationService.googleCallback(req.user);

    if (result.requiresProfileCompletion) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/complete-profile?userId=${result.userId}`,
      );
    }

    return res.redirect(
      `${process.env.FRONTEND_URL}/auth/success?token=${result.accessToken}`,
    );
  }

  @Patch('complete-profile')
  async completeProfile(@Body() dto: CompleteProfileDto) {
    return this.authenticationService.completeProfile(dto);
  }
}
