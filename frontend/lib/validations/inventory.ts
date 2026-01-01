import { z } from 'zod';

export const createInventoryItemSchema = (t: (key: string) => string) => {
  return z.object({
    title: z.string().min(1, t('validation.titleRequired')),
    club: z.union([z.string().min(1, t('validation.clubRequired')), z.number().min(1, t('validation.clubRequired'))]),
    category: z.union([z.string().min(1, t('validation.categoryRequired')), z.number().min(1, t('validation.categoryRequired'))]),
    description: z.string().min(1, t('validation.descriptionRequired')),
    status: z.string().min(1, t('validation.statusRequired')),
    // All other fields are optional
    quantity: z.number().optional(),
    max_borrow_duration: z.number().optional(),
    tags: z.array(z.number()).optional(),
    internal_note: z.string().optional(),
  });
};

export type InventoryItemFormData = z.infer<ReturnType<typeof createInventoryItemSchema>>;


