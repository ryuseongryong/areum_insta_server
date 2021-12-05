import { Exclude, Expose } from 'class-transformer';
import {
  IsArray,
  IsDefined,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';

// @Exclude()
export class CheckUrlArrDto {
  @IsArray()
  @IsUrl(undefined, {
    each: true,
    message:
      'element of the urlArr must be an Instagram URL address : https://www.instagram.com/p/{something}',
  })
  readonly urlArr: Array<string>;
}
