import { Module } from '@nestjs/common';
import { AgentsModule } from './agents/agents.module.js';
import { AuthModule } from './auth/auth.module.js';
import { ClientsModule } from './clients/clients.module.js';
import { DatabaseModule } from './database/database.module.js';
import { HealthController } from './health.controller.js';
import { PropertiesModule } from './properties/properties.module.js';
import { UsersModule } from './users/users.module.js';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    UsersModule,
    ClientsModule,
    PropertiesModule,
    AgentsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
