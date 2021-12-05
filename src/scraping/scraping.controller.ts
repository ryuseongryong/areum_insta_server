import { Body, Controller, Post } from '@nestjs/common';
import { CheckUrlDto } from './dto/check-url.dto';
import { CheckUrlArrDto } from './dto/check-urlArr.dto';
import { ScrapingService } from './scraping.service';

@Controller('scraping')
export class ScrapingController {
  constructor(private readonly scrapingService: ScrapingService) {}

  @Post('input')
  findLikeCount(@Body() body: CheckUrlDto): Promise<{
    name: string;
    engagements: number;
    likes: number;
    replies: number;
    followers: number;
  }> {
    return this.scrapingService.findLikeCount(body);
  }

  @Post('inputSum')
  findLikeCountSum(@Body() body: CheckUrlArrDto) {
    return this.scrapingService.findLikeCountSum(body);
  }

  @Post('inputMany')
  findLikeCountMany(@Body() body: CheckUrlArrDto) {
    return this.scrapingService.findLikeCountMany(body);
  }
}
