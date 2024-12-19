import { Test, TestingModule } from '@nestjs/testing';
import { PointController } from './point.controller';
import { PointService } from './point.service';
import { PointBody } from './point.dto';
import { UserPoint, PointHistory, TransactionType } from './point.model';

describe('PointController', () => {
  let controller: PointController;
  let service: PointService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PointController],
      providers: [
        {
          provide: PointService,
          useValue: {
            findById: jest.fn(),
            findHistoriesById: jest.fn(),
            charge: jest.fn(),
            use: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<PointController>(PointController);
    service = module.get<PointService>(PointService);
  });

  describe('GET /point/:id', () => {
    it('should return user point', async () => {
      const mockUserPoint: UserPoint = {
        id: 1,
        point: 100,
        updateMillis: Date.now(),
      };
      jest.spyOn(service, 'findById').mockResolvedValue(mockUserPoint);

      const result = await controller.point('1');

      expect(service.findById).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockUserPoint);
    });
  });

  describe('GET /point/:id/histories', () => {
    it('should return user point histories', async () => {
      const mockHistories: PointHistory[] = [
        {
          id: 1,
          userId: 1,
          amount: 100,
          type: TransactionType.CHARGE,
          timeMillis: Date.now(),
        },
      ];
      jest.spyOn(service, 'findHistoriesById').mockResolvedValue(mockHistories);

      const result = await controller.history('1');

      expect(service.findHistoriesById).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockHistories);
    });
  });

  describe('PATCH /point/:id/charge', () => {
    it('should charge user points', async () => {
      const mockPointHistory: PointHistory = {
        id: 1,
        userId: 1,
        amount: 100,
        type: TransactionType.CHARGE,
        timeMillis: Date.now(),
      };
      const mockRequest: PointBody = { amount: 100 };

      jest.spyOn(service, 'charge').mockResolvedValue(mockPointHistory);

      const result = await controller.charge('1', mockRequest);

      expect(service.charge).toHaveBeenCalledWith(1, mockRequest);
      expect(result).toEqual(mockPointHistory);
    });
  });

  describe('PATCH /point/:id/use', () => {
    it('should use user points', async () => {
      const mockPointHistory: PointHistory = {
        id: 1,
        userId: 1,
        amount: 50,
        type: TransactionType.USE,
        timeMillis: Date.now(),
      };
      const mockRequest: PointBody = { amount: 50 };

      jest.spyOn(service, 'use').mockResolvedValue(mockPointHistory);

      const result = await controller.use('1', mockRequest);

      expect(service.use).toHaveBeenCalledWith(1, mockRequest);
      expect(result).toEqual(mockPointHistory);
    });
  });
});
