import {
    Injectable,
    ConflictException,
    UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { RegisterReqDto, LoginReqDto } from './dto/auth.req.dto';
import { AuthResDto } from './dto/auth.res.dto';

@Injectable()
export class AuthService {
    constructor(
        private usersService: UsersService,
        private jwtService: JwtService,
    ) { }


    async register(dto: RegisterReqDto): Promise<AuthResDto> {
        const existing = await this.usersService.findByEmail(dto.email);
        if (existing) throw new ConflictException('Email already in use');
        const hashed = await bcrypt.hash(dto.password, 10);
        const user = await this.usersService.create(dto.email, hashed, dto.name);
        return this.signToken(user.id, user.email, user.name);
    }

    async login(dto: LoginReqDto): Promise<AuthResDto> {
        const user = await this.usersService.findByEmail(dto.email);
        if (!user) throw new UnauthorizedException('Invalid credentials');

        const valid = await bcrypt.compare(dto.password, user.password);
        if (!valid) throw new UnauthorizedException('Invalid credentials');

        return this.signToken(user.id, user.email, user.name);
    }

    private signToken(userId: number, email: string, name: string) {
        const payload = { sub: userId, email, name };
        return {
            access_token: this.jwtService.sign(payload),
        };
    }
}
