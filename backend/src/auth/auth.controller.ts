import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { IsOptional, IsString, MinLength } from 'class-validator';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthUser } from '../common/types/auth-user';

class RefreshDto {
  @IsString()
  refresh_token: string;
}

class PinLoginDto {
  @IsString()
  tenant_id: string;

  @IsString()
  @MinLength(4)
  pin: string;
}

class SetPinDto {
  @IsString()
  @MinLength(4)
  pin: string;

  @IsOptional()
  @IsString()
  user_id?: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private meta(req: Request) {
    return {
      ip: (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip,
      ua: req.headers['user-agent'],
    };
  }

  @Post('login')
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login(dto.email, dto.password, this.meta(req));
  }

  @Post('refresh')
  refresh(@Body() dto: RefreshDto, @Req() req: Request) {
    return this.authService.refresh(dto.refresh_token, this.meta(req));
  }

  @Post('logout')
  logout(@Body() dto: RefreshDto) {
    return this.authService.logout(dto.refresh_token);
  }

  @Post('pin')
  pinLogin(@Body() dto: PinLoginDto, @Req() req: Request) {
    return this.authService.verifyPinAndIssue(
      dto.tenant_id,
      dto.pin,
      this.meta(req),
    );
  }

  @Post('pin/set')
  @UseGuards(JwtAuthGuard)
  setPin(@CurrentUser() user: AuthUser, @Body() dto: SetPinDto) {
    const target = dto.user_id || user.id;
    return this.authService.setPin(target, dto.pin, user.role);
  }
}
