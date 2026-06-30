import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { createPrismaClient, PrismaClient } from '@soyre/database';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly prismaClient = createPrismaClient();

  readonly $transaction: PrismaClient['$transaction'] =
    this.prismaClient.$transaction.bind(this.prismaClient);

  get auditLog() {
    return this.prismaClient.auditLog;
  }

  get client() {
    return this.prismaClient.client;
  }

  get clientIdentityDocument() {
    return this.prismaClient.clientIdentityDocument;
  }

  get membership() {
    return this.prismaClient.membership;
  }

  get organization() {
    return this.prismaClient.organization;
  }

  get property() {
    return this.prismaClient.property;
  }

  get realEstateAgent() {
    return this.prismaClient.realEstateAgent;
  }

  get user() {
    return this.prismaClient.user;
  }

  async onModuleInit() {
    await this.prismaClient.$connect();
  }

  async onModuleDestroy() {
    await this.prismaClient.$disconnect();
  }
}
