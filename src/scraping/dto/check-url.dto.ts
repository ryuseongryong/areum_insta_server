import { IsUrl } from 'class-validator';

export class CheckUrlDto {
  @IsUrl()
  readonly url: string;
}
