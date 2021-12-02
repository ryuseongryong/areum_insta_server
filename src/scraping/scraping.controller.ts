import { Body, Controller, Post } from '@nestjs/common';
import { ScrapingService } from './scraping.service';

@Controller('scraping')
export class ScrapingController {
  constructor(private readonly scrapingService: ScrapingService) {}

  @Post('input')
  findLikeCount(@Body() body) {
    return this.scrapingService.findLikeCount(body);
  }
}
