import { Injectable } from '@nestjs/common';
import { PointHistoryTable } from 'src/database/pointhistory.table';
import { UserPointTable } from 'src/database/userpoint.table';
import { PointHistory, TransactionType, UserPoint } from './point.model';
import { PointBody } from './point.dto';

@Injectable()
export class PointService {
  constructor(
    private readonly userDb: UserPointTable,
    private readonly historyDb: PointHistoryTable,
  ) {}

  async findById(id: number): Promise<UserPoint> {
    return await this.userDb.selectById(id);
  }

  async findHistoriesById(id: number): Promise<PointHistory[]> {
    return await this.historyDb.selectAllByUserId(id);
  }

  async getIsUsable(id: number, amount: number): Promise<boolean> {
    const { point } = await this.userDb.selectById(id);

    return point >= amount;
  }

  async charge(id: number, chargeDto: PointBody): Promise<PointHistory> {
    const updateMillis = Date.now();

    return await this.historyDb.insert(
      id,
      chargeDto.amount,
      TransactionType.CHARGE,
      updateMillis,
    );
  }

  async use(id: number, useDto: PointBody): Promise<PointHistory> {
    const isUsable = this.getIsUsable(id, useDto.amount);
    if (!isUsable) {
      throw new Error('잔고가 충분하지 않습니다.');
    }

    const updateMillis = Date.now();

    return await this.historyDb.insert(
      id,
      useDto.amount,
      TransactionType.USE,
      updateMillis,
    );
  }
}
