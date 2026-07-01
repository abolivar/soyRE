import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, RealEstateAgent } from '@soyre/database';
import {
  BROKER_OPERATION_ROLES,
  READ_ROLES,
} from '../auth/authorization.constants.js';
import { OrganizationAccessService } from '../auth/organization-access.service.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { PrismaService } from '../database/prisma.service.js';
import { CreateRealEstateAgentDto } from './dto/create-real-estate-agent.dto.js';
import { ListRealEstateAgentsQueryDto } from './dto/list-real-estate-agents-query.dto.js';

@Injectable()
export class AgentsService {
  constructor(
    @Inject(OrganizationAccessService)
    private readonly organizationAccess: OrganizationAccessService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  async list(auth: AuthenticatedUser, query: ListRealEstateAgentsQueryDto) {
    const membership = this.resolveReadableMembership(auth, query.organizationId);
    const search = query.search?.trim();
    const where: Prisma.RealEstateAgentWhereInput = {
      organizationId: membership.organizationId,
      ...(query.category ? { category: query.category } : {}),
      ...(search
        ? {
            OR: [
              { displayName: { contains: search, mode: 'insensitive' } },
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              { companyName: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search, mode: 'insensitive' } },
              { whatsapp: { contains: search, mode: 'insensitive' } },
              { licenseNumber: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const agents = await this.prisma.realEstateAgent.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
      take: 100,
    });

    return {
      organization: this.organizationAccess.serializeOrganization(membership),
      agents: agents.map((agent: RealEstateAgent) => this.serializeAgent(agent)),
    };
  }

  async get(auth: AuthenticatedUser, agentId: string, organizationId?: string) {
    const where = this.resolveAgentAccessWhere(auth, agentId, organizationId);
    const agent = await this.prisma.realEstateAgent.findFirst({ where });

    if (!agent) {
      throw new NotFoundException(
        'Real estate agent was not found in this organization.',
      );
    }

    return { agent: this.serializeAgent(agent) };
  }

  async create(auth: AuthenticatedUser, dto: CreateRealEstateAgentDto) {
    const membership = this.resolveWritableMembership(auth, dto.organizationId);
    const firstName = requiredName(dto.firstName, 'First name is required.');
    const lastName = requiredName(dto.lastName, 'Last name is required.');
    const displayName = `${firstName} ${lastName}`.trim();
    const email = normalizeEmail(dto.email);
    const phone = cleanText(dto.phone);
    const whatsapp = cleanText(dto.whatsapp);

    if (!email && !phone && !whatsapp) {
      throw new BadRequestException(
        'At least one contact method is required for the agent.',
      );
    }

    const result = await this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        if (email) {
          const existingAgent = await tx.realEstateAgent.findFirst({
            where: {
              email,
              organizationId: membership.organizationId,
            },
            select: { id: true },
          });

          if (existingAgent) {
            throw new ConflictException(
              'An agent with this email already exists in this organization.',
            );
          }
        }

        const agent = await tx.realEstateAgent.create({
          data: {
            organizationId: membership.organizationId,
            category: dto.category,
            firstName,
            lastName,
            displayName,
            companyName: cleanText(dto.companyName),
            email,
            phone,
            whatsapp,
            licenseNumber: cleanText(dto.licenseNumber),
            notes: cleanText(dto.notes),
          },
        });

        await tx.auditLog.create({
          data: {
            organizationId: membership.organizationId,
            actorUserId: auth.id,
            action: 'real_estate_agents.create',
            targetType: 'real_estate_agent',
            targetId: agent.id,
            metadata: {
              category: agent.category,
              displayName: agent.displayName,
              email: agent.email,
            },
          },
        });

        return agent;
      },
    );

    return { agent: this.serializeAgent(result) };
  }

  private resolveReadableMembership(
    auth: AuthenticatedUser,
    organizationId?: string,
  ) {
    return this.organizationAccess.resolveMembership(auth, organizationId, {
      permission: 'Agent read',
      roles: READ_ROLES,
    });
  }

  private resolveWritableMembership(
    auth: AuthenticatedUser,
    organizationId?: string,
  ) {
    return this.organizationAccess.resolveMembership(auth, organizationId, {
      permission: 'Agent write',
      roles: BROKER_OPERATION_ROLES,
    });
  }

  private resolveAgentAccessWhere(
    auth: AuthenticatedUser,
    agentId: string,
    organizationId?: string,
  ): Prisma.RealEstateAgentWhereInput {
    if (organizationId) {
      const membership = this.resolveReadableMembership(auth, organizationId);

      return {
        id: agentId,
        organizationId: membership.organizationId,
      };
    }

    const organizationIds = this.organizationAccess.organizationIds(
      auth,
      READ_ROLES,
    );

    return {
      id: agentId,
      organizationId: { in: organizationIds },
    };
  }

  private serializeAgent(agent: RealEstateAgent) {
    return {
      id: agent.id,
      organizationId: agent.organizationId,
      category: agent.category,
      firstName: agent.firstName,
      lastName: agent.lastName,
      displayName: agent.displayName,
      companyName: agent.companyName,
      email: agent.email,
      phone: agent.phone,
      whatsapp: agent.whatsapp,
      licenseNumber: agent.licenseNumber,
      notes: agent.notes,
      isActive: agent.isActive,
      createdAt: agent.createdAt.toISOString(),
      updatedAt: agent.updatedAt.toISOString(),
    };
  }
}

function cleanText(value?: string) {
  const normalized = value?.trim();

  return normalized ? normalized : null;
}

function requiredName(value: string, message: string) {
  const normalized = cleanText(value);

  if (!normalized) {
    throw new BadRequestException(message);
  }

  return toNameCase(normalized);
}

function normalizeEmail(value?: string) {
  return cleanText(value)?.toLowerCase() ?? null;
}

function toNameCase(value: string) {
  return value
    .toLocaleLowerCase('es-PA')
    .replace(/(^|[\s'-])(\p{L})/gu, (match, boundary: string, letter: string) =>
      `${boundary}${letter.toLocaleUpperCase('es-PA')}`,
    );
}
