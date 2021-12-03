import { Body, Controller, Post } from '@nestjs/common';
import { CheckUrlDto } from './dto/check-url.dto';
import { ScrapingService } from './scraping.service';

@Controller('scraping')
export class ScrapingController {
  constructor(private readonly scrapingService: ScrapingService) {}

  @Post('input')
  findLikeCount(
    @Body() body: CheckUrlDto,
  ): Promise<{
    name: string;
    title: string;
    likes: number;
    replies: number;
    followers: number;
  }> {
    return this.scrapingService.findLikeCount(body);
  }
}
