import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { PushDeliveryProcessor } from './push-delivery.processor';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'push-notifications',
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    }),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, PushDeliveryProcessor],
  exports: [NotificationsService],
})
export class NotificationsModule {}
