import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RegisterReqDto, LoginReqDto } from './dto/auth.req.dto';

describe('AuthController', () => {
    let controller: AuthController;
    let service: AuthService;

    const mockAuthService = {
        register: jest.fn(),
        login: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [AuthController],
            providers: [
                {
                    provide: AuthService,
                    useValue: mockAuthService,
                },
            ],
        }).compile();

        controller = module.get<AuthController>(AuthController);
        service = module.get<AuthService>(AuthService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('register', () => {
        it('should call authService.register with body', async () => {
            const body: RegisterReqDto = { email: 'test@example.com', password: 'password', name: 'Test' };
            mockAuthService.register.mockResolvedValue({ token: 'test-token', user: { id: 1 } });
            const result = await controller.register(body);
            expect(service.register).toHaveBeenCalledWith(body);
            expect(result).toEqual({ token: 'test-token', user: { id: 1 } });
        });
    });

    describe('login', () => {
        it('should call authService.login with body', async () => {
            const body: LoginReqDto = { email: 'test@example.com', password: 'password' };
            mockAuthService.login.mockResolvedValue({ token: 'test-token', user: { id: 1 } });
            const result = await controller.login(body);
            expect(service.login).toHaveBeenCalledWith(body);
            expect(result).toEqual({ token: 'test-token', user: { id: 1 } });
        });
    });

    describe('getProfile', () => {
        it('should return req.user', () => {
            const req = { user: { id: 1, email: 'test@example.com' } };
            const result = controller.getProfile(req);
            expect(result).toEqual(req.user);
        });
    });
});
