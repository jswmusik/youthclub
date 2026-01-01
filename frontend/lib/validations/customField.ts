import { z } from 'zod';

export const createCustomFieldSchema = (t: (key: string) => string) => {
  return z.object({
    name: z.string().min(1, t('validation.nameRequired')),
    // All other fields are optional or have conditional requirements
    help_text: z.string().optional(),
    field_type: z.string().optional(),
    options: z.array(z.string()).optional(),
    required: z.boolean().optional(),
    is_published: z.boolean().optional(),
    target_roles: z.array(z.string()).optional(),
    specific_clubs: z.array(z.number()).optional(),
    context: z.string().optional(),
  });
};

export type CustomFieldFormData = z.infer<ReturnType<typeof createCustomFieldSchema>>;


