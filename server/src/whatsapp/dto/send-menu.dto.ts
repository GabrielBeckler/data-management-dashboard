import { IsArray, IsNotEmpty, IsString } from 'class-validator';

export class SendMenuDto {
  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsArray()
  menu: string[];
}
