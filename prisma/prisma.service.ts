import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService extends PrismaClient {
  constructor() {
    const adapter = new PrismaPg({
      host: 'localhost',
      port: 5432,
      user: 'postgres',
      password: '55435421', // ✅ explicitly a string
      database: 'courses_project_db',
    });
    super({ adapter });
  }
}
