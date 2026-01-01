import { z } from 'zod';

// Factory function that takes the translation function and context
export const createYouthSchema = (t: (key: string) => string, isEditing: boolean = false) => {
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
    date_of_birth: z.string().min(1, t('validation.dateOfBirthRequired')),
    grade: z.string().min(1, t('validation.gradeRequired')),
    legal_gender: z.string().min(1, t('validation.legalGenderRequired')),
    preferred_club: z.string().min(1, t('validation.preferredClubRequired')),
    // Optional fields
    nickname: z.string().optional(),
    preferred_gender: z.string().optional(),
    verification_status: z.string().optional(),
    interests: z.array(z.number()).optional(),
    guardians: z.array(z.number()).optional(),
  });
};

export type YouthFormData = z.infer<ReturnType<typeof createYouthSchema>>;

