import { IsArray, IsUrl } from 'class-validator';

export class CheckUrlArrDto {
  @IsArray()
  @IsUrl({ each: true })
  readonly urlArr: Array<string>;
}
