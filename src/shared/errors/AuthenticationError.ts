import { AppError } from './AppError';

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication failed', code = 'AUTH_TOKEN_INVALID') {
    super(message, 401, code);
  }
}
