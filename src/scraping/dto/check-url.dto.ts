import { IsString, IsUrl } from 'class-validator';

export class CheckUrlDto {
  @IsUrl(undefined, {
    message:
      'url must be an Instagram URL address : https://www.instagram.com/p/{something}',
  })
  readonly url: string;
}
