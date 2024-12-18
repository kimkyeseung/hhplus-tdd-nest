import { Test, TestingModule } from '@nestjs/testing';
import { PointService } from './point.service';
import { UserPointTable } from 'src/database/userpoint.table';
import { PointHistoryTable } from 'src/database/pointhistory.table';
import { PointBody } from './point.dto';
import { TransactionType, UserPoint, PointHistory } from './point.model';

describe('PointService', () => {
  let service: PointService;
  let userPointTable: jest.Mocked<UserPointTable>;
  let pointHistoryTable: jest.Mocked<PointHistoryTable>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PointService,
        {
          provide: UserPointTable,
          useValue: {
            selectById: jest.fn(),
            insertOrUpdate: jest.fn(),
          },
        },
        {
          provide: PointHistoryTable,
          useValue: {
            insert: jest.fn(),
            selectAllByUserId: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PointService>(PointService);
    userPointTable = module.get(UserPointTable);
    pointHistoryTable = module.get(PointHistoryTable);
  });

  describe('findById', () => {
    it('should return user point when user exists', async () => {
      const userId = 1;
      const userPoint: UserPoint = {
        id: userId,
        point: 100,
        updateMillis: Date.now(),
      };
      userPointTable.selectById.mockResolvedValue(userPoint);

      const result = await service.findById(userId);

      expect(userPointTable.selectById).toHaveBeenCalledWith(userId);
      expect(result).toEqual(userPoint);
    });

    it('should fail when user does not exist', async () => {
      const userId = 999;
      userPointTable.selectById.mockRejectedValue(
        new Error('사용자를 찾을 수 없습니다.'),
      );

      await expect(service.findById(userId)).rejects.toThrow(
        '사용자를 찾을 수 없습니다.',
      );
      expect(userPointTable.selectById).toHaveBeenCalledWith(userId);
    });
  });

  describe('findHistoriesById', () => {
    it('should return histories when user exists', async () => {
      const userId = 1;
      const userPoint = { id: userId, point: 100, updateMillis: Date.now() };
      const histories = [
        {
          id: 1,
          userId,
          amount: 100,
          type: TransactionType.CHARGE,
          timeMillis: Date.now(),
        },
      ];

      userPointTable.selectById.mockResolvedValue(userPoint);
      pointHistoryTable.selectAllByUserId.mockResolvedValue(histories);

      const result = await service.findHistoriesById(userId);

      expect(userPointTable.selectById).toHaveBeenCalledWith(userId);
      expect(pointHistoryTable.selectAllByUserId).toHaveBeenCalledWith(userId);
      expect(result).toEqual(histories);
    });

    it('should fail when user does not exist', async () => {
      const userId = 999;

      userPointTable.selectById.mockRejectedValue(
        new Error('사용자를 찾을 수 없습니다.'),
      );

      await expect(service.findHistoriesById(userId)).rejects.toThrow(
        '사용자를 찾을 수 없습니다.',
      );

      expect(pointHistoryTable.selectAllByUserId).not.toHaveBeenCalled();
    });
  });

  describe('charge', () => {
    it('should fail when user does not exist', async () => {
      const userId = 999;
      const chargeDto: PointBody = { amount: 100 };
      userPointTable.selectById.mockRejectedValue(
        new Error('사용자를 찾을 수 없습니다.'),
      );

      await expect(service.charge(userId, chargeDto)).rejects.toThrow(
        '사용자를 찾을 수 없습니다.',
      );
      expect(userPointTable.selectById).toHaveBeenCalledWith(userId);
    });

    it('should fail when amount is less than 1', async () => {
      const userId = 1;
      const chargeDto: PointBody = { amount: 0 };

      await expect(service.charge(userId, chargeDto)).rejects.toThrow(
        '충전 금액은 1원 이상의 정수여야 합니다.',
      );
    });

    it('should increase balance after charge', async () => {
      const userId = 1;
      const chargeDto: PointBody = { amount: 100 };
      const userPoint: UserPoint = {
        id: userId,
        point: 50,
        updateMillis: Date.now(),
      };
      const updatedUserPoint: UserPoint = {
        id: userId,
        point: 150,
        updateMillis: Date.now(),
      };
      const history: PointHistory = {
        id: 1,
        userId,
        amount: 100,
        type: TransactionType.CHARGE,
        timeMillis: Date.now(),
      };

      userPointTable.selectById.mockResolvedValue(userPoint);
      pointHistoryTable.insert.mockResolvedValue(history);
      userPointTable.insertOrUpdate.mockResolvedValue(updatedUserPoint);

      const result = await service.charge(userId, chargeDto);

      expect(userPointTable.selectById).toHaveBeenCalledWith(userId);
      expect(pointHistoryTable.insert).toHaveBeenCalled();
      expect(userPointTable.insertOrUpdate).toHaveBeenCalledWith(userId, 150);
      expect(result).toEqual(history);
    });

    it('should process multiple requests sequentially', async () => {
      const userId = 1;
      const chargeDto: PointBody = { amount: 100 };
      const userPoint: UserPoint = {
        id: userId,
        point: 0,
        updateMillis: Date.now(),
      };
      const history: PointHistory = {
        id: 1,
        userId,
        amount: 100,
        type: TransactionType.CHARGE,
        timeMillis: Date.now(),
      };

      userPointTable.selectById.mockResolvedValue(userPoint);
      pointHistoryTable.insert.mockResolvedValue(history);
      userPointTable.insertOrUpdate.mockResolvedValue({
        id: userId,
        point: 100,
        updateMillis: Date.now(),
      });

      const chargePromises = [
        service.charge(userId, chargeDto),
        service.charge(userId, chargeDto),
      ];

      const results = await Promise.all(chargePromises);

      expect(userPointTable.selectById).toHaveBeenCalledTimes(2);
      expect(pointHistoryTable.insert).toHaveBeenCalledTimes(2);
      expect(userPointTable.insertOrUpdate).toHaveBeenCalledTimes(2);
      expect(results).toHaveLength(2);
    });
  });

  describe('use', () => {
    it('should fail when user does not exist', async () => {
      const userId = 999;
      const useDto: PointBody = { amount: 50 };
      userPointTable.selectById.mockRejectedValue(
        new Error('사용자를 찾을 수 없습니다.'),
      );

      await expect(service.use(userId, useDto)).rejects.toThrow(
        '사용자를 찾을 수 없습니다.',
      );
      expect(userPointTable.selectById).toHaveBeenCalledWith(userId);
    });

    it('should fail when amount is less than 1', async () => {
      const userId = 1;
      const useDto: PointBody = { amount: 0 };

      await expect(service.use(userId, useDto)).rejects.toThrow(
        '사용 금액은 1원 이상의 정수여야 합니다.',
      );
    });

    it('should fail when balance is insufficient', async () => {
      const userId = 1;
      const useDto: PointBody = { amount: 100 };
      const userPoint: UserPoint = {
        id: userId,
        point: 50,
        updateMillis: Date.now(),
      };
      userPointTable.selectById.mockResolvedValue(userPoint);

      await expect(service.use(userId, useDto)).rejects.toThrow(
        '잔고가 충분하지 않습니다.',
      );
      expect(userPointTable.selectById).toHaveBeenCalledWith(userId);
    });

    it('should process multiple requests sequentially', async () => {
      const userId = 1;
      const useDto: PointBody = { amount: 50 };
      const userPoint: UserPoint = {
        id: userId,
        point: 100,
        updateMillis: Date.now(),
      };
      const history: PointHistory = {
        id: 1,
        userId,
        amount: 50,
        type: TransactionType.USE,
        timeMillis: Date.now(),
      };

      userPointTable.selectById.mockResolvedValue(userPoint);
      pointHistoryTable.insert.mockResolvedValue(history);
      userPointTable.insertOrUpdate.mockResolvedValue({
        id: userId,
        point: 50,
        updateMillis: Date.now(),
      });

      const usePromises = [
        service.use(userId, useDto),
        service.use(userId, useDto),
      ];
      const results = await Promise.all(usePromises);

      expect(userPointTable.selectById).toHaveBeenCalledTimes(2);
      expect(pointHistoryTable.insert).toHaveBeenCalledTimes(2);
      expect(userPointTable.insertOrUpdate).toHaveBeenCalledTimes(2);

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual(history);
      expect(results[1]).toEqual(history);
    });

    it('should process multiple requests sequentially', async () => {
      const userId = 1;
      const useDto: PointBody = { amount: 50 };
      const userPoint: UserPoint = {
        id: userId,
        point: 100,
        updateMillis: Date.now(),
      };
      const history: PointHistory = {
        id: 1,
        userId,
        amount: 50,
        type: TransactionType.USE,
        timeMillis: Date.now(),
      };

      userPointTable.selectById.mockResolvedValue(userPoint);
      pointHistoryTable.insert.mockResolvedValue(history);
      userPointTable.insertOrUpdate.mockResolvedValue({
        id: userId,
        point: 50,
        updateMillis: Date.now(),
      });

      const usePromises = [
        service.use(userId, useDto),
        service.use(userId, useDto),
      ];

      const results = await Promise.all(usePromises);

      expect(userPointTable.selectById).toHaveBeenCalledTimes(2);
      expect(pointHistoryTable.insert).toHaveBeenCalledTimes(2);
      expect(userPointTable.insertOrUpdate).toHaveBeenCalledTimes(2);
      expect(results).toHaveLength(2);
    });
  });
});
