import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../config/prisma.js';
import logger from '../config/winston.js';

const JWT_SECRET = process.env.JWT_SECRET ?? 'development-secret-key';

export type AuthTokenPayload = {
  token: string;
  user: {
    id: number;
    email: string;
    roles: string[];
    role: string;
  };
};

export async function loginUser(email: string, password: string): Promise<AuthTokenPayload> {
  if (!email || !password) {
    throw Object.assign(new Error('Email and password are required'), { statusCode: 400 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        roles: {
          include: { role: true }
        }
      }
    });

    if (!user) {
      throw Object.assign(new Error('Invalid email or password'), { statusCode: 401 });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      throw Object.assign(new Error('Invalid email or password'), { statusCode: 401 });
    }

    const roles: string[] = user.roles.map((entry: { role: { name: string } }) => entry.role.name);
    const primaryRole = roles[0] ?? 'Student';

    const token = jwt.sign(
      {
        user_id: user.id,
        userId: user.id,
        role: primaryRole,
        roles
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        roles,
        role: primaryRole
      }
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const statusCode = error && typeof error === 'object' && 'statusCode' in error ? Number(error.statusCode) : 500;
    logger.error(`Login service error: ${message}`);

    if (statusCode === 400 || statusCode === 401) {
      throw Object.assign(new Error(message), { statusCode });
    }

    throw Object.assign(new Error('Internal server error'), { statusCode: 500 });
  }
}
