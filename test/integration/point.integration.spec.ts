import { Test, TestingModule } from '@nestjs/testing';
import { PointController } from '../../src/point/point.controller';
import { PointService } from '../../src/point/point.service';
import { UserPointTable } from '../../src/database/userpoint.table';
import { PointHistoryTable } from '../../src/database/pointhistory.table';
import { PointBody } from '../../src/point/point.dto';
import { TransactionType } from 'src/point/point.model';

describe('Point Integration Tests', () => {
  let controller: PointController;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PointController],
      providers: [PointService, UserPointTable, PointHistoryTable],
    }).compile();

    controller = module.get<PointController>(PointController);
  });

  it('should charge points correctly', async () => {
    const userId = 1;
    const chargeDto: PointBody = { amount: 100 };

    const result = await controller.charge(userId.toString(), chargeDto);

    expect(result.amount).toBe(100);
    expect(result.type).toBe(TransactionType.CHARGE);
  });

  it('should retrieve user points after charge', async () => {
    const userId = 1;

    const result = await controller.point(userId.toString());

    expect(result.point).toBeGreaterThan(0);
  });
});
