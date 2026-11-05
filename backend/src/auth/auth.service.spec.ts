import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';

jest.mock('argon2');

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: any;
  let jwtService: any;
  let configService: any;

  beforeEach(async () => {
    prismaService = {
      user: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
      },
    };

    jwtService = {
      signAsync: jest.fn().mockResolvedValue('mock_token'),
      verify: jest.fn(),
    };

    configService = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'JWT_SECRET') return 'test_secret';
        if (key === 'JWT_REFRESH_SECRET') return 'test_refresh_secret';
        return null;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prismaService },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      prismaService.user.findFirst.mockResolvedValue(null);
      (argon2.hash as jest.Mock).mockResolvedValue('hashed_password');

      const mockCreatedUser = {
        id: 'user_1',
        email: 'test@example.com',
        fullName: 'Nguyễn Văn A',
        phone: '0901234567',
        role: 'USER',
        status: 'ACTIVE',
        createdAt: new Date(),
      };
      prismaService.user.create.mockResolvedValue(mockCreatedUser);

      const result = await service.register({
        email: 'test@example.com',
        password: 'password123',
        fullName: 'Nguyễn Văn A',
        phone: '0901234567',
      });

      expect(result.user).toEqual(mockCreatedUser);
      expect(result.accessToken).toBe('mock_token');
      expect(result.refreshToken).toBe('mock_token');
      expect(prismaService.user.create).toHaveBeenCalled();
    });

    it('should throw ConflictException if email exists', async () => {
      prismaService.user.findFirst.mockResolvedValue({
        id: 'existing_user',
        email: 'test@example.com',
      });

      await expect(
        service.register({
          email: 'test@example.com',
          password: 'password123',
          fullName: 'Nguyễn Văn A',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      const mockUser = {
        id: 'user_1',
        email: 'test@example.com',
        fullName: 'Nguyễn Văn A',
        passwordHash: 'hashed_pw',
        phone: null,
        role: 'USER',
        status: 'ACTIVE',
        avatarUrl: null,
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      (argon2.verify as jest.Mock).mockResolvedValue(true);

      const result = await service.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.user.email).toBe('test@example.com');
      expect(result.accessToken).toBe('mock_token');
    });

    it('should throw UnauthorizedException for invalid password', async () => {
      prismaService.user.findUnique.mockResolvedValue({
        id: 'user_1',
        email: 'test@example.com',
        passwordHash: 'hashed_pw',
        status: 'ACTIVE',
      });
      (argon2.verify as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({
          email: 'test@example.com',
          password: 'wrongpassword',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if account is SUSPENDED', async () => {
      prismaService.user.findUnique.mockResolvedValue({
        id: 'user_1',
        email: 'test@example.com',
        passwordHash: 'hashed_pw',
        status: 'SUSPENDED',
      });

      await expect(
        service.login({
          email: 'test@example.com',
          password: 'password123',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});

