import { z } from 'zod';

export const createRewardSchema = (t: (key: string) => string) => {
  return z.object({
    name: z.string().min(1, t('validation.nameRequired')),
    description: z.string().min(1, t('validation.descriptionRequired')),
    // All other fields are optional
    sponsor_name: z.string().optional(),
    sponsor_link: z.string().optional(),
    target_groups: z.array(z.number()).optional(),
    target_interests: z.array(z.number()).optional(),
    target_genders: z.array(z.string()).optional(),
    target_grades: z.array(z.number()).optional(),
    min_age: z.string().optional(),
    max_age: z.string().optional(),
    target_member_type: z.string().optional(),
    expiration_date: z.string().optional(),
    usage_limit: z.string().optional(),
    active_triggers: z.array(z.string()).optional(),
    trigger_config: z.any().optional(),
    is_active: z.boolean().optional(),
  });
};

export type RewardFormData = z.infer<ReturnType<typeof createRewardSchema>>;




