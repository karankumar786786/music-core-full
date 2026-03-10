import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FeedService } from './feed.service';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('feed')
@ApiBearerAuth()
@Controller('feed')
@UseGuards(JwtAuthGuard)
export class FeedController {
    constructor(private readonly feedService: FeedService) { }

    @Get()
    async getFeed(
        @Req() req,
        @Query('exclude') exclude?: string,
    ) {
        const userId = req.user.id;
        const excludeIds = exclude ? exclude.split(',').filter(Boolean) : [];
        return this.feedService.getUserFeed(userId, excludeIds);
    }
}

