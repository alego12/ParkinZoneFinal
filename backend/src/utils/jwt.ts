import jwt from 'jsonwebtoken';
import { User } from '../models/User';

export const generateToken = (user: User): string => {
  const secret = process.env.JWT_SECRET || 'default_secret_key';
  
  // @ts-ignore - JWT types issue
  return jwt.sign(
    { 
      userId: user.id, 
      email: user.email, 
      role: user.role 
    },
    secret,
    { expiresIn: '24h' }
  );
};

export const verifyToken = (token: string): any => {
  const secret = process.env.JWT_SECRET || 'default_secret_key';
  // @ts-ignore - JWT types issue
  return jwt.verify(token, secret);
};
