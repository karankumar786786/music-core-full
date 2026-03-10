import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../global/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { getProfilePictureUploadUrl } from '../lib/helpers/storage/profile-picture-upload.s3';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
    constructor(private prisma: PrismaService) { }

    async findByEmail(email: string) {
        return this.prisma.user.findUnique({ where: { email } });
    }

    async findById(id: number) {
        return this.prisma.user.findUnique({ where: { id } });
    }

    async create(email: string, hashedPassword: string, name: string) {
        return this.prisma.user.create({
            data: { email, password: hashedPassword, name },
        });
    }

    async getProfile(userId: number) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) throw new NotFoundException('User not found');

        const { password, ...result } = user;
        return result;
    }

    async updateProfile(userId: number, updateProfileDto: UpdateProfileDto) {
        const user = await this.prisma.user.update({
            where: { id: userId },
            data: {
                name: updateProfileDto.name,
                profilePictureKey: updateProfileDto.profilePictureKey,
            },
        });

        const { password, ...result } = user;
        return result;
    }

    async changePassword(userId: number, changePasswordDto: ChangePasswordDto) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) throw new NotFoundException('User not found');

        const isPasswordValid = await bcrypt.compare(
            changePasswordDto.oldPassword,
            user.password,
        );

        if (!isPasswordValid) {
            throw new NotFoundException('Invalid old password');
        }

        const hashedNewPassword = await bcrypt.hash(changePasswordDto.newPassword, 10);

        await this.prisma.user.update({
            where: { id: userId },
            data: {
                password: hashedNewPassword,
            },
        });

        return { message: 'Password updated successfully' };
    }

    async getProfilePictureUploadUrl(userId: number, fileName: string, contentType: string) {
        return getProfilePictureUploadUrl(userId, fileName, contentType);
    }
}
