import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AgentsModule } from './agents/agents.module.js';
import { AuthModule } from './auth/auth.module.js';
import { JwtAuthGuard } from './auth/jwt-auth.guard.js';
import { RolesGuard } from './auth/roles.guard.js';
import { BusinessesModule } from './businesses/businesses.module.js';
import { ClientsModule } from './clients/clients.module.js';
import { DashboardModule } from './dashboard/dashboard.module.js';
import { DatabaseModule } from './database/database.module.js';
import { HealthController } from './health.controller.js';
import { FinanceModule } from './finance/finance.module.js';
import { OperationsModule } from './operations/operations.module.js';
import { PlatformModule } from './platform/platform.module.js';
import { PropertiesModule } from './properties/properties.module.js';
import { TasksModule } from './tasks/tasks.module.js';
import { UsersModule } from './users/users.module.js';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    UsersModule,
    ClientsModule,
    PropertiesModule,
    AgentsModule,
    BusinessesModule,
    FinanceModule,
    PlatformModule,
    DashboardModule,
    TasksModule,
    OperationsModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
