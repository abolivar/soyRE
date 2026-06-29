import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module.js';
import { DatabaseModule } from './database/database.module.js';
import { HealthController } from './health.controller.js';
import { UsersModule } from './users/users.module.js';

@Module({
  imports: [DatabaseModule, AuthModule, UsersModule],
  controllers: [HealthController],
})
export class AppModule {}
