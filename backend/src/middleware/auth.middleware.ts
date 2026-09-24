import jwt from 'jsonwebtoken';
import prisma from '../config/prisma.js';

const JWT_SECRET = process.env.JWT_SECRET ?? 'development-secret-key';

export const verifyJWT = async (req: any, res: any, next: any): Promise<any> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as {
      user_id?: number;
      userId?: number;
      roles?: string[];
      role?: string;
    };

    const userId = decoded.user_id ?? decoded.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token payload' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { roles: { include: { role: true } } }
    });

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized: Invalid user' });
    }

    const roles: string[] = user.roles.map((entry: { role: { name: string } }) => entry.role.name);

    req.user = {
      userId: user.id,
      roles,
      role: decoded.role ?? roles[0] ?? 'Student'
    };

    return next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: 'Unauthorized: Token expired' });
    }

    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

export const requireRole = (allowedRoles: string[]) => (req: any, res: any, next: any): any => {
  if (!req.user || !Array.isArray(req.user.roles)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const hasRole = req.user.roles.some((role: string) => allowedRoles.includes(role));
  if (!hasRole) {
    return res.status(403).json({ error: 'Forbidden: Insufficient role' });
  }

  return next();
};
