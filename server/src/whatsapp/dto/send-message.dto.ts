import { IsNotEmpty, IsPhoneNumber, IsString } from 'class-validator';

export class SendMessageDto {
  @IsString()
  @IsPhoneNumber('BR', { message: 'phone must be a valid Brazilian phone number' })
  phone: string;

  @IsString()
  @IsNotEmpty()
  message: string;
}
