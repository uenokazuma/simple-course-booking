import { listTrialClasses, getTrialClassById } from '../services/trial-class.service.js';

export const listTrialClassesController = async (_req: any, res: any): Promise<any> => {
  try {
    const trialClasses = await listTrialClasses();
    return res.status(200).json({ data: trialClasses });
  } catch (error: any) {
    const statusCode = Number(error?.statusCode ?? 500);
    return res.status(statusCode).json({ error: error instanceof Error ? error.message : 'Internal server error' });
  }
};

export const getTrialClassController = async (req: any, res: any): Promise<any> => {
  try {
    const trialClassId = Number(req.params.trialClassId);
    const trialClass = await getTrialClassById(trialClassId);

    if (!trialClass) {
      return res.status(404).json({ error: 'Trial class not found' });
    }

    return res.status(200).json({ data: trialClass });
  } catch (error: any) {
    const statusCode = Number(error?.statusCode ?? 500);
    return res.status(statusCode).json({ error: error instanceof Error ? error.message : 'Internal server error' });
  }
};
