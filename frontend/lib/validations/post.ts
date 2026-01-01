import { z } from 'zod';

// Helper function to strip HTML tags and check if content is actually empty
const stripHtml = (html: string): string => {
  return html
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
    .trim(); // Trim whitespace
};

export const createPostSchema = (t: (key: string) => string) => {
  return z.object({
    title: z.string().min(1, t('validation.titleRequired')),
    content: z.string()
      .min(1, t('validation.contentRequired'))
      .refine((val) => stripHtml(val).length > 0, {
        message: t('validation.contentRequired'),
      }),
    // Optional fields
    postType: z.string().optional(),
    videoUrl: z.string().optional(),
    status: z.string().optional(),
    publishedAt: z.string().optional(),
    visibilityEndDate: z.string().optional(),
    isPinned: z.boolean().optional(),
    allowComments: z.boolean().optional(),
    requireModeration: z.boolean().optional(),
    allowReplies: z.boolean().optional(),
    limitComments: z.number().optional(),
    sendPush: z.boolean().optional(),
    pushTitle: z.string().optional(),
    pushMessage: z.string().optional(),
  });
};

export type PostFormData = z.infer<ReturnType<typeof createPostSchema>>;

