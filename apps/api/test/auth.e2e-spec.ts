import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import supertest from 'supertest';
import { AppModule } from '../src/app.module';

describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/v1/auth/register - should register a new user', () => {
    return supertest(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: `test-${Date.now()}@example.com`,
        username: `testuser${Date.now()}`,
        displayName: 'Test User',
        password: 'SecurePass@123',
      })
      .expect(201);
  });

  it('POST /api/v1/auth/login - should reject invalid credentials', () => {
    return supertest(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'nonexistent@example.com', password: 'wrong' })
      .expect(401);
  });
});
