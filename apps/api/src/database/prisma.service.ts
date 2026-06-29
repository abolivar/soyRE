import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { createPrismaClient, PrismaClient } from '@soyre/database';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly client = createPrismaClient();

  readonly $transaction: PrismaClient['$transaction'] =
    this.client.$transaction.bind(this.client);

  get auditLog() {
    return this.client.auditLog;
  }

  get membership() {
    return this.client.membership;
  }

  get organization() {
    return this.client.organization;
  }

  get user() {
    return this.client.user;
  }

  async onModuleInit() {
    await this.client.$connect();
  }

  async onModuleDestroy() {
    await this.client.$disconnect();
  }
}
