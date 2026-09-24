import { loginUser } from '../services/auth.service.js';

export const login = async (req: any, res: any): Promise<any> => {
  try {
    const { email, password } = req.body ?? {};
    const result = await loginUser(email, password);

    return res.status(200).json({
      message: 'Login successful',
      token: result.token,
      user: result.user
    });
  } catch (error: any) {
    const statusCode = Number(error?.statusCode ?? 500);
    const message = error instanceof Error ? error.message : 'Internal server error';

    return res.status(statusCode).json({ error: message });
  }
};
