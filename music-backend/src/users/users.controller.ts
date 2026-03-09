import { Controller, Get, Patch, Body, UseGuards, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Get('me')
    getProfile(@Request() req) {
        return this.usersService.getProfile(req.user.id);
    }

    @Patch('me')
    updateProfile(@Request() req, @Body() updateProfileDto: UpdateProfileDto) {
        return this.usersService.updateProfile(req.user.id, updateProfileDto);
    }
}
