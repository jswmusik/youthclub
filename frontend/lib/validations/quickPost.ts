import { z } from 'zod';

// Helper function to strip HTML tags and check if content is actually empty
const stripHtml = (html: string): string => {
  return html
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
    .trim(); // Trim whitespace
};

export const createQuickPostSchema = (t: (key: string) => string) => {
  return z.object({
    selectedTemplate: z.number().min(1, t('validation.templateRequired')),
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
    sendPush: z.boolean().optional(),
    pushTitle: z.string().optional(),
    pushMessage: z.string().optional(),
  });
};

export type QuickPostFormData = z.infer<ReturnType<typeof createQuickPostSchema>>;

