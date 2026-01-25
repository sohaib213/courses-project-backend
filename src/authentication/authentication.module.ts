import { Module, forwardRef } from '@nestjs/common';
import { AuthenticationService } from './authentication.service';
import { AuthenticationController } from './authentication.controller';
import { EmailService } from './email.service';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { AuthGuard } from '../common/guards/authentication.guard';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import googleOauthConfig from './config/google-oauth.config';
import { GoogleStrategy } from './strategies/google.strategy';
import { CartModule } from 'src/cart/cart.module';

@Module({
  imports: [
    CloudinaryModule,
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET_KEY'),
        signOptions: { expiresIn: '5m' },
      }),
      inject: [ConfigService],
    }),
    ConfigModule.forFeature(googleOauthConfig),
    forwardRef(() => CartModule),
  ],
  controllers: [AuthenticationController],
  providers: [AuthenticationService, EmailService, AuthGuard, GoogleStrategy],
  exports: [JwtModule],
})
export class AuthenticationModule {}
