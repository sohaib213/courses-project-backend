import { Profile, Strategy } from 'passport-google-oauth20';
import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import googleOauthConfig from '../config/google-oauth.config';
import type { ConfigType } from '@nestjs/config';
import { AuthenticationService } from '../authentication.service';
import { PrismaService } from 'prisma/prisma.service';
import { users } from '@prisma/client';
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy) {
  constructor(
    @Inject(googleOauthConfig.KEY)
    private googleConfigration: ConfigType<typeof googleOauthConfig>,
    private authService: AuthenticationService,
    private readonly prisma: PrismaService,
  ) {
    super({
      clientID: googleConfigration.clientID,
      clientSecret: googleConfigration.clientSecret,
      callbackURL: googleConfigration.callbackURL,
      scope: ['email', 'profile'],
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: Profile) {
    const { emails, photos } = profile;

    let user: users = await this.prisma.users.findUnique({
      where: { email: emails[0].value },
    });

    if (!user) {
      // Create incomplete user on first signup
      user = await this.prisma.users.create({
        data: {
          email: emails[0].value,
          image: photos[0]?.value,
          isprofilecomplete: false,
          type: 'Student',
          provider: 'google',
        },
      });
    }

    if (user && user.provider !== 'google') {
      throw new ConflictException(
        `An account with this email already exists using ${user.provider} provider. Please sign in with ${user.provider} instead.`,
      );
    }
    return user;
  }
}
