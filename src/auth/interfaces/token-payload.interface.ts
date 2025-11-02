import { UserRole } from '../../user/entities/user.entity';

export interface TokenPayload {
  email: string;
  sub: number;
  role: UserRole;
  customer_id?: number;
  type: 'access_token' | 'refresh_token';
}
