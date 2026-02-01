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
import { cart_items, cart_status, payment_status } from '@prisma/client';
import Stripe from 'stripe';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CartService {
  private stripe: Stripe;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.stripe = new Stripe(this.config.get<string>('STRIPE_API_KEY'));
  }
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

    const alreadyEnrolled = await this.prisma.enrollments.findFirst({
      where: {
        student_id: user_id,
        course_id,
      },
    });

    if (alreadyEnrolled) {
      throw new BadRequestException('You are already enrolled in this course');
    }
    return await this.prisma.cart_items.create({
      data: {
        course_id,
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
      const cart = await tx.carts.findFirst({
        where: {
          user_id,
          status: cart_status.Active,
        },
      });

      if (!cart) throw new NotFoundException('Active cart not found');

      const cart_items = await this.findItemsInCart(cart.id, user_id);
      if (cart_items.length === 0)
        throw new ForbiddenException('Cart is empty');

      const { totalAmount, session } = await this.createStripe(
        cart_items,
        user_id,
      );

      // Create payment record with PENDING status and Stripe reference
      await tx.payments.create({
        data: {
          cart_id: cart.id,
          amount: totalAmount,
          status: payment_status.Pending, // Changed to Pending
          stripe_payment_intent_id: session.id, // Store Stripe reference
          paid_at: null, // Will be set after webhook confirmation
          user_id,
        },
      });

      return session;
    });
  }

  async createStripe(cart_items: cart_items[], user_id: string) {
    const courses = await this.prisma.courses.findMany({
      where: {
        id: { in: cart_items.map((i) => i.course_id) },
      },
      select: {
        id: true,
        title: true,
        price: true,
        thumbnail_url: true,
      },
    });

    const courseMap = new Map(courses.map((c) => [c.id, c]));

    let totalAmount = 0;

    const line_items = cart_items.map((item) => {
      const course = courseMap.get(item.course_id);
      if (!course) throw new Error('Invalid course');

      totalAmount += Number(course.price);

      return {
        price_data: {
          currency: 'usd',
          unit_amount: Number(course.price) * 100,
          product_data: {
            name: course.title,
            images: [course.thumbnail_url],
          },
        },
        quantity: 1,
      };
    });

    const session = await this.stripe.checkout.sessions.create({
      line_items,
      mode: 'payment',
      success_url: `${this.config.get<string>('FRONTEND_URL')}/payment?success=true`,
      cancel_url: `${this.config.get<string>('FRONTEND_URL')}/payment?success=false`,
      client_reference_id: user_id,
      metadata: {
        user_id,
      },
    });

    return { totalAmount, session };
  }

  async handleWebhookEvent(event: Stripe.Event) {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        return this.confirmPayment(session.id); // all DB & enrollments logic here
      }

      // optionally handle other events
      default:
        console.log(`Unhandled event type ${event.type}`);
    }
  }

  async confirmPayment(paymentIntentId: string) {
    console.log('Enter Confirm id = ', paymentIntentId);
    return this.prisma.$transaction(async (tx) => {
      // Find payment by Stripe payment intent ID
      const payment = await tx.payments.findUnique({
        where: { stripe_payment_intent_id: paymentIntentId },
        include: { carts: true },
      });

      console.log(1);
      if (!payment) throw new NotFoundException('Payment not found');
      if (payment.status === payment_status.Paid) {
        return payment; // Already processed
      }

      const cart = await this.prisma.carts.findUnique({
        where: {
          id: payment.cart_id,
        },
      });

      console.log(2);

      // Get cart items for enrollment
      const cart_items = await this.findItemsInCart(
        payment.cart_id,
        cart.user_id,
      );
      console.log(3);

      // Update payment to Paid
      await tx.payments.update({
        where: { id: payment.id },
        data: {
          status: payment_status.Paid,
          paid_at: new Date(),
        },
      });
      console.log(4);

      // Create enrollments
      const enrollmentsData = cart_items.map((item) => ({
        student_id: cart.user_id,
        course_id: item.course_id,
      }));
      console.log(5);

      await tx.enrollments.createMany({
        data: enrollmentsData,
        skipDuplicates: true,
      });
      console.log(6);

      // Mark cart as checked out
      await tx.carts.update({
        where: { id: payment.cart_id },
        data: { status: cart_status.CheckedOut },
      });

      console.log(7);

      // Create new active cart
      await tx.carts.create({
        data: { user_id: cart.user_id },
      });

      return payment;
    });
  }

  async getPayments(user_id: string) {
    console.log('user id = ', user_id);
    const payments = await this.prisma.payments.findMany({
      where: {
        user_id,
      },
    });
    return payments;
  }
}
