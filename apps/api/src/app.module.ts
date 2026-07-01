import { Module } from '@nestjs/common';
import { AgentsModule } from './agents/agents.module.js';
import { AuthModule } from './auth/auth.module.js';
import { BusinessesModule } from './businesses/businesses.module.js';
import { ClientsModule } from './clients/clients.module.js';
import { DashboardModule } from './dashboard/dashboard.module.js';
import { DatabaseModule } from './database/database.module.js';
import { HealthController } from './health.controller.js';
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
    DashboardModule,
    TasksModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
