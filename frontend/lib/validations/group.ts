import { z } from 'zod';

export const createGroupSchema = (t: (key: string) => string) => {
  return z.object({
    name: z.string().min(1, t('validation.nameRequired')),
    group_type: z.string().min(1, t('validation.groupTypeRequired')),
    description: z.string().min(1, t('validation.descriptionRequired')),
    // Optional fields
    target_member_type: z.string().optional(),
    min_age: z.string().optional(),
    max_age: z.string().optional(),
    grades: z.array(z.number()).optional(),
    genders: z.array(z.string()).optional(),
    interests: z.array(z.number()).optional(),
    custom_field_rules: z.record(z.string(), z.any()).optional(),
    members_to_add: z.array(z.number()).optional(),
  });
};

export type GroupFormData = z.infer<ReturnType<typeof createGroupSchema>>;




