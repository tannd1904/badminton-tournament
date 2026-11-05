import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { PrismaService } from '../prisma/prisma.service';

describe('HealthController', () => {
  let controller: HealthController;
  let prismaService: any;

  beforeEach(async () => {
    prismaService = {
      $queryRaw: jest.fn().mockResolvedValue([{ 1: 1 }]),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: PrismaService,
          useValue: prismaService,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return healthy status when database is reachable', async () => {
    const result = await controller.check();
    expect(result.status).toBe('ok');
    expect(result.services.database).toBe('connected');
    expect(result.services.api).toBe('healthy');
  });

  it('should return unreachable status when database fails', async () => {
    prismaService.$queryRaw.mockRejectedValueOnce(new Error('Connection failed'));
    const result = await controller.check();
    expect(result.status).toBe('ok');
    expect(result.services.database).toBe('unreachable');
  });
});

