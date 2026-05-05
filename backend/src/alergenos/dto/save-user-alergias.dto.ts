import { IsArray, IsString } from 'class-validator';

export class SaveUserAlergiasDto {
  @IsArray()
  @IsString({ each: true })
  alergias: string[];
}