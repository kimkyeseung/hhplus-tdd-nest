import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
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

  private locks: Map<number, Promise<void>> = new Map();

  private async acquireLock(id: number): Promise<void> {
    while (this.locks.has(id)) {
      await this.locks.get(id);
    }

    const resolver = () => this.locks.delete(id);
    this.locks.set(
      id,
      new Promise<void>((r) => setTimeout(r, 0)).finally(resolver),
    );
  }

  private async validateUserExists(id: number): Promise<UserPoint> {
    const user = await this.userDb.selectById(id);
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다.');
    return user;
  }

  async findById(id: number): Promise<UserPoint> {
    return await this.validateUserExists(id);
  }

  async findHistoriesById(id: number): Promise<PointHistory[]> {
    await this.validateUserExists(id);
    return this.historyDb.selectAllByUserId(id);
  }

  async charge(id: number, chargeDto: PointBody): Promise<PointHistory> {
    if (chargeDto.amount <= 0) {
      throw new BadRequestException('충전 금액은 1원 이상의 정수여야 합니다.');
    }

    const user = await this.validateUserExists(id);
    await this.userDb.insertOrUpdate(id, user.point + chargeDto.amount);

    const updateMillis = Date.now();
    return await this.historyDb.insert(
      id,
      chargeDto.amount,
      TransactionType.CHARGE,
      updateMillis,
    );
  }

  async use(id: number, useDto: PointBody): Promise<PointHistory> {
    if (useDto.amount <= 0) {
      throw new BadRequestException('사용 금액은 1원 이상의 정수여야 합니다.');
    }

    await this.acquireLock(id);

    try {
      const user = await this.validateUserExists(id);
      if (user.point < useDto.amount) {
        throw new BadRequestException('잔고가 충분하지 않습니다.');
      }

      await this.userDb.insertOrUpdate(id, user.point - useDto.amount);

      const updateMillis = Date.now();
      return await this.historyDb.insert(
        id,
        useDto.amount,
        TransactionType.USE,
        updateMillis,
      );
    } finally {
      this.locks.delete(id);
    }
  }
}
