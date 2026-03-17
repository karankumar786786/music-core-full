import { PartialType } from '@nestjs/mapped-types';
import { CreateUserplaylistDto } from './create-userplaylist.dto';

export class UpdateUserplaylistDto extends PartialType(CreateUserplaylistDto) {}
