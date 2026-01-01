import { z } from 'zod';

// Factory function that takes the translation function and context
export const createGuardianSchema = (t: (key: string) => string, isEditing: boolean = false) => {
  return z.object({
    first_name: z.string().min(1, t('validation.firstNameRequired')),
    last_name: z.string().min(1, t('validation.lastNameRequired')),
    email: z.string()
      .min(1, t('validation.emailRequired'))
      .email(t('validation.invalidEmail')),
    password: isEditing 
      ? z.string().optional() // Password is optional when editing
      : z.string().min(1, t('validation.passwordRequired')), // Required when creating
    phone_number: z.string().min(1, t('validation.phoneRequired')),
    legal_gender: z.string().min(1, t('validation.legalGenderRequired')),
    // Optional fields
    verification_status: z.string().optional(),
    youth_members: z.array(z.number()).optional(),
  });
};

export type GuardianFormData = z.infer<ReturnType<typeof createGuardianSchema>>;

