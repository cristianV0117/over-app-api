import { IsString, MaxLength } from "class-validator";

export class VehicleAssistantChatDto {
  @IsString()
  @MaxLength(4000)
  message!: string;
}
