declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: number;
        roles: string[];
        role?: string;
      };
    }
  }
}

export {};
