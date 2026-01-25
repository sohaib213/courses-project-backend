import { forwardRef, Module } from '@nestjs/common';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';
import { AuthenticationModule } from 'src/authentication/authentication.module';

@Module({
  imports: [forwardRef(() => AuthenticationModule)],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}
