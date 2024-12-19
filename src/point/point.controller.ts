import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  ValidationPipe,
} from '@nestjs/common';
import { PointService } from './point.service';
import { PointHistory, UserPoint } from './point.model';
import { PointBody as PointDto } from './point.dto';

@Controller('/point')
export class PointController {
  constructor(private readonly pointService: PointService) {}

  @Get(':id')
  async point(@Param('id') id: string): Promise<UserPoint> {
    const userId = Number.parseInt(id);
    if (isNaN(userId)) {
      throw new Error('유효하지 않은 사용자 ID입니다.');
    }

    return await this.pointService.findById(userId);
  }

  @Get(':id/histories')
  async history(@Param('id') id: string): Promise<PointHistory[]> {
    const userId = Number.parseInt(id);
    if (isNaN(userId)) {
      throw new Error('유효하지 않은 사용자 ID입니다.');
    }

    return await this.pointService.findHistoriesById(userId);
  }

  @Patch(':id/charge')
  async charge(
    @Param('id') id: string,
    @Body(ValidationPipe) pointDto: PointDto,
  ): Promise<PointHistory> {
    const userId = Number.parseInt(id);
    if (isNaN(userId)) {
      throw new Error('유효하지 않은 사용자 ID입니다.');
    }

    return await this.pointService.charge(userId, pointDto);
  }

  @Patch(':id/use')
  async use(
    @Param('id') id: string,
    @Body(ValidationPipe) pointDto: PointDto,
  ): Promise<PointHistory> {
    const userId = Number.parseInt(id);
    if (isNaN(userId)) {
      throw new Error('유효하지 않은 사용자 ID입니다.');
    }

    return await this.pointService.use(userId, pointDto);
  }
}
