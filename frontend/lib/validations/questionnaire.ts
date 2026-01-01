import { z } from 'zod';

export const createQuestionnaireSchema = (t: (key: string) => string) => {
  return z.object({
    title: z.string().min(1, t('validation.titleRequired')),
    description: z.string().min(1, t('validation.descriptionRequired')),
    expiration_date: z.string().min(1, t('validation.expirationDateRequired')),
    // All other fields are optional
    status: z.string().optional(),
    questions: z.array(z.any()).optional(),
    rewards: z.array(z.any()).optional(),
    target_audience: z.string().optional(),
    scheduled_publish_date: z.string().optional(),
    requires_approval: z.boolean().optional(),
    max_responses_per_user: z.number().optional(),
    allow_anonymous: z.boolean().optional(),
  });
};

export type QuestionnaireFormData = z.infer<ReturnType<typeof createQuestionnaireSchema>>;


