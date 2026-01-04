import { z } from 'zod';

// Factory function that takes the translation function and context
export const createAdminSchema = (t: (key: string) => string, isEditing: boolean = false, scope?: 'SUPER' | 'MUNICIPALITY' | 'CLUB') => {
  // Password validation with strength requirements
  const passwordValidation = z.string()
    .min(8, t('validation.passwordMinLength') || 'Password must be at least 8 characters')
    .regex(/\d/, t('validation.passwordNumber') || 'Password must contain at least one number')
    .regex(/[!@#$%^&*(),.?":{}|<>]/, t('validation.passwordSpecial') || 'Password must contain at least one special character');

  // Password: required when creating, optional when editing but if provided must meet strength requirements
  const passwordField = isEditing 
    ? z.string()
        .optional()
        .refine((val) => !val || passwordValidation.safeParse(val).success, {
          message: t('validation.passwordStrength') || 'Password must be at least 8 characters, contain at least one number and one special character',
        })
    : passwordValidation.min(1, t('validation.passwordRequired'));

  // Assignment field: required for CLUB scope
  const assignedClubField = scope === 'CLUB'
    ? z.string().min(1, t('validation.assignedClubRequired') || 'Club assignment is required')
    : z.string().optional();

  return z.object({
    first_name: z.string().min(1, t('validation.firstNameRequired')),
    last_name: z.string().min(1, t('validation.lastNameRequired')),
    email: z.string()
      .min(1, t('validation.emailRequired'))
      .email(t('validation.invalidEmail')),
    password: passwordField,
    legal_gender: z.string().min(1, t('validation.genderRequired')),
    // Optional fields
    nickname: z.string().optional(),
    phone_number: z.string()
      .optional()
      .refine((val) => !val || /^\d+$/.test(val), {
        message: t('validation.phoneNumbersOnly') || 'Phone number must contain only numbers',
      }),
    profession: z.string().optional(),
    assigned_municipality: z.string().optional(),
    assigned_club: assignedClubField,
    hide_contact_info: z.boolean().optional(),
    role: z.string().optional(),
  });
};

export type AdminFormData = z.infer<ReturnType<typeof createAdminSchema>>;

