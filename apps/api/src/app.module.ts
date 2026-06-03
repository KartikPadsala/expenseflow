import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { BullModule } from '@nestjs/bull';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { GroupsModule } from './groups/groups.module';
import { ExpensesModule } from './expenses/expenses.module';
import { FriendsModule } from './friends/friends.module';
import { SettlementsModule } from './settlements/settlements.module';
import { CategoriesModule } from './categories/categories.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AttachmentsModule } from './attachments/attachments.module';
import { OcrModule } from './ocr/ocr.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { ExchangeRatesModule } from './exchange-rates/exchange-rates.module';
import { RecurringModule } from './recurring/recurring.module';
import { PrismaModule } from './prisma/prisma.module';
import { MailModule } from './mail/mail.module';
import { StorageModule } from './storage/storage.module';
import { SearchModule } from './search/search.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '../../.env' }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    EventEmitterModule.forRoot(),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        redis: configService.get<string>('REDIS_URL') || 'redis://localhost:6379',
      }),
      inject: [ConfigService],
    }),
    PrismaModule,
    MailModule,
    StorageModule,
    AuthModule,
    UsersModule,
    GroupsModule,
    ExpensesModule,
    FriendsModule,
    SettlementsModule,
    CategoriesModule,
    NotificationsModule,
    AttachmentsModule,
    OcrModule,
    AnalyticsModule,
    ExchangeRatesModule,
    RecurringModule,
    SearchModule,
  ],
})
export class AppModule {}
