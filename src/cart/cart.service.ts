import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { AddItemDto } from './dto/AddItem.dto';
import { PrismaService } from 'prisma/prisma.service';
import { cart_status, payment_status } from '@prisma/client';

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  async createCart(user_id: string) {
    const cart = await this.prisma.carts.create({
      data: {
        user_id,
      },
    });
    return cart;
  }

  async addItem(addItemDto: AddItemDto, user_id: string) {
    const course_id: string = addItemDto.course_id;
    const course = await this.prisma.courses.findUnique({
      where: {
        id: course_id,
      },
    });
    if (!course) throw new BadRequestException('no course with this id');

    const cart = await this.findUserActiveCart(user_id);

    const existingItem = await this.prisma.cart_items.findFirst({
      where: { cart_id: cart.id, course_id },
    });
    if (existingItem) {
      throw new BadRequestException('Course is already in the cart');
    }

    return await this.prisma.cart_items.create({
      data: {
        course_id,
        price_at_time: course.price,
        cart_id: cart.id,
      },
    });
  }

  async removeItem(id: string, user_id: string) {
    const item = await this.prisma.cart_items.findUnique({
      where: {
        id,
      },
    });

    if (!item) throw new NotFoundException('no item with this id');
    const cart = await this.prisma.carts.findUnique({
      where: {
        id: item.cart_id,
      },
    });
    if (!cart) throw new NotFoundException("can't found cart related to item");
    if (cart.status === cart_status.CheckedOut)
      throw new ForbiddenException("can't remove items from checked cart");

    if (user_id !== cart.user_id)
      throw new UnauthorizedException(
        'you are not authorized to delete this item',
      );

    const deleted = await this.prisma.cart_items.delete({
      where: {
        id,
      },
    });
    if (deleted) return 'item deleted successfully';
    else
      throw new InternalServerErrorException("can't delete item with this id");
  }

  async findAllUserCarts(user_id: string) {
    return await this.prisma.carts.findMany({
      where: {
        user_id: user_id,
      },
    });
  }

  async findUserActiveCart(user_id: string) {
    return await this.prisma.carts.findFirst({
      where: {
        user_id,
        status: cart_status.Active,
      },
    });
  }

  async findCartById(id: string, user_id: string) {
    const cart = await this.prisma.carts.findUnique({
      where: {
        id,
      },
    });
    if (!cart) throw new NotFoundException('Cart with id not found');
    if (cart.user_id !== user_id)
      throw new UnauthorizedException(
        'you are not authorized to see this cart',
      );
    return cart;
  }

  async findItemsInCart(cart_id: string, user_id: string) {
    await this.findCartById(cart_id, user_id);

    return await this.prisma.cart_items.findMany({
      where: {
        cart_id,
      },
    });
  }

  async pay(user_id: string) {
    return this.prisma.$transaction(async (tx) => {
      console.log(1);
      const cart = await tx.carts.findFirst({
        where: {
          user_id,
          status: cart_status.Active,
        },
      });
      console.log(2);

      const cart_items = await this.findItemsInCart(cart.id, user_id);
      console.log(3);

      if (cart_items.length === 0)
        throw new ForbiddenException('Cart is empty');

      const amount = cart_items.reduce((sum, item) => {
        return sum + Number(item.price_at_time);
      }, 0);
      console.log(4);

      const newPayment = await tx.payments.create({
        data: {
          cart_id: cart.id,
          amount,
          status: payment_status.Paid,
          paid_at: new Date(),
        },
      });
      console.log(5);

      const enrollmentsData = cart_items.map((item) => ({
        student_id: user_id,
        course_id: item.course_id,
      }));
      console.log(6);

      await tx.enrollments.createMany({
        data: enrollmentsData,
        skipDuplicates: true, // avoid duplicate enrollment
      });
      console.log(7);

      await tx.carts.update({
        where: { id: cart.id },
        data: { status: cart_status.CheckedOut },
      });

      console.log(8);

      await tx.carts.create({ data: { user_id } });

      return newPayment;
    });
  }
}
