import { z } from 'zod';

export const createPostTemplateSchema = (t: (key: string) => string) => {
  return z.object({
    name: z.string().min(1, t('validation.nameRequired')),
    // Optional fields
    description: z.string().optional(),
    icon: z.string().optional(),
    is_active: z.boolean().optional(),
    default_post_type: z.string().optional(),
    target_member_type: z.string().optional(),
    target_min_age: z.number().nullable().optional(),
    target_max_age: z.number().nullable().optional(),
    target_grades: z.array(z.number()).optional(),
    target_genders: z.array(z.string()).optional(),
    target_groups: z.array(z.number()).optional(),
    target_interests: z.array(z.number()).optional(),
    target_custom_fields: z.record(z.any()).optional(),
    allow_comments: z.boolean().optional(),
    require_moderation: z.boolean().optional(),
    allow_replies: z.boolean().optional(),
    limit_comments_per_user: z.number().optional(),
    send_push_notification: z.boolean().optional(),
    default_push_title: z.string().optional(),
    default_push_message: z.string().optional(),
    is_pinned_default: z.boolean().optional(),
  });
};

export type PostTemplateFormData = z.infer<ReturnType<typeof createPostTemplateSchema>>;

