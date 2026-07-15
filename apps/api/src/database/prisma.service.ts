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

  get business() {
    return this.prismaClient.business;
  }

  get businessContract() {
    return this.prismaClient.businessContract;
  }

  get businessContractClause() {
    return this.prismaClient.businessContractClause;
  }

  get businessFee() {
    return this.prismaClient.businessFee;
  }

  get businessParticipant() {
    return this.prismaClient.businessParticipant;
  }

  get calculationSnapshot() {
    return this.prismaClient.calculationSnapshot;
  }

  get client() {
    return this.prismaClient.client;
  }

  get clientIdentityDocument() {
    return this.prismaClient.clientIdentityDocument;
  }

  get document() {
    return this.prismaClient.document;
  }

  get documentChecklistTemplate() {
    return this.prismaClient.documentChecklistTemplate;
  }

  get documentChecklistTemplateItem() {
    return this.prismaClient.documentChecklistTemplateItem;
  }

  get businessDocumentChecklist() {
    return this.prismaClient.businessDocumentChecklist;
  }

  get businessDocumentRequirement() {
    return this.prismaClient.businessDocumentRequirement;
  }

  get listing() {
    return this.prismaClient.listing;
  }

  get mandate() {
    return this.prismaClient.mandate;
  }

  get membership() {
    return this.prismaClient.membership;
  }

  get organization() {
    return this.prismaClient.organization;
  }

  get commissionAllocation() {
    return this.prismaClient.commissionAllocation;
  }

  get commissionPlan() {
    return this.prismaClient.commissionPlan;
  }

  get compensationApplication() {
    return this.prismaClient.compensationApplication;
  }

  get contractType() {
    return this.prismaClient.contractType;
  }

  get paymentPlan() {
    return this.prismaClient.paymentPlan;
  }

  get paymentScheduleLine() {
    return this.prismaClient.paymentScheduleLine;
  }

  get payoutMethod() {
    return this.prismaClient.payoutMethod;
  }

  get payoutProfile() {
    return this.prismaClient.payoutProfile;
  }

  get property() {
    return this.prismaClient.property;
  }

  get realEstateAgent() {
    return this.prismaClient.realEstateAgent;
  }

  get offer() {
    return this.prismaClient.offer;
  }

  get scheduledAction() {
    return this.prismaClient.scheduledAction;
  }

  get disbursement() {
    return this.prismaClient.disbursement;
  }

  get showing() {
    return this.prismaClient.showing;
  }

  get user() {
    return this.prismaClient.user;
  }

  get workflowStage() {
    return this.prismaClient.workflowStage;
  }

  async onModuleInit() {
    await this.prismaClient.$connect();
  }

  async onModuleDestroy() {
    await this.prismaClient.$disconnect();
  }
}
