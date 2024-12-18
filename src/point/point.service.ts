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

  async findById(id: number): Promise<UserPoint> {
    const user = await this.userDb.selectById(id);
    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }
    return user;
  }

  async findHistoriesById(id: number): Promise<PointHistory[]> {
    const user = await this.userDb.selectById(id);
    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }
    return await this.historyDb.selectAllByUserId(id);
  }

  async getIsUsable(id: number, amount: number): Promise<boolean> {
    const user = await this.userDb.selectById(id);
    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }
    return user.point >= amount;
  }

  async charge(id: number, chargeDto: PointBody): Promise<PointHistory> {
    if (chargeDto.amount <= 0) {
      throw new BadRequestException('충전 금액은 1원 이상의 정수여야 합니다.');
    }

    const user = await this.userDb.selectById(id);
    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

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

    const user = await this.userDb.selectById(id);
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    const isUsable = await this.getIsUsable(id, useDto.amount);
    if (!isUsable) {
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
  }
}
