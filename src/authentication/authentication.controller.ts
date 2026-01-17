import { Body, Controller, Post } from '@nestjs/common';
import { AuthenticationService } from './authentication.service';
import { RegisterDto } from './dto/register.dto';

@Controller('auth')
export class AuthenticationController {
  constructor(private readonly authenticationService: AuthenticationService) {}
  @Post('register')
  register(@Body() registerDto: RegisterDto) {
    return this.authenticationService.Register(registerDto);
  }
  @Post('verify')
  verigyEmail(@Body() body: { email: string; code: string | number }) {
    return this.authenticationService.verifyEmail(body);
  }
}
