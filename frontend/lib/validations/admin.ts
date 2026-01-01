import { z } from 'zod';

// Factory function that takes the translation function and context
export const createAdminSchema = (t: (key: string) => string, isEditing: boolean = false) => {
  return z.object({
    first_name: z.string().min(1, t('validation.firstNameRequired')),
    last_name: z.string().min(1, t('validation.lastNameRequired')),
    email: z.string()
      .min(1, t('validation.emailRequired'))
      .email(t('validation.invalidEmail')),
    password: isEditing 
      ? z.string().optional() // Password is optional when editing
      : z.string().min(1, t('validation.passwordRequired')), // Required when creating
    legal_gender: z.string().min(1, t('validation.genderRequired')),
    // Optional fields
    nickname: z.string().optional(),
    phone_number: z.string().optional(),
    profession: z.string().optional(),
    assigned_municipality: z.string().optional(),
    assigned_club: z.string().optional(),
    hide_contact_info: z.boolean().optional(),
    role: z.string().optional(),
  });
};

export type AdminFormData = z.infer<ReturnType<typeof createAdminSchema>>;

