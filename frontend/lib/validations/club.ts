import { z } from 'zod';

// Factory function that takes the translation function and scope
export const createClubSchema = (t: (key: string) => string, scope: 'SUPER' | 'MUNICIPALITY') => {
  const baseSchema = z.object({
    name: z.string().min(1, t('validation.nameRequired')),
    description: z.string().min(1, t('validation.descriptionRequired')),
    email: z.string()
      .min(1, t('validation.emailRequired'))
      .email(t('validation.invalidEmail')),
    phone: z.string().min(1, t('validation.phoneRequired')),
    address: z.string().min(1, t('validation.addressRequired')),
    terms_and_conditions: z.string().min(1, t('validation.termsRequired')),
    club_policies: z.string().min(1, t('validation.policiesRequired')),
    // Optional fields
    latitude: z.union([z.string(), z.number()]).optional(),
    longitude: z.union([z.string(), z.number()]).optional(),
    club_categories: z.string().optional(),
    allow_self_registration_override: z.string().optional(),
    require_guardian_override: z.string().optional(),
  });

  // Add municipality field only for SUPER scope
  if (scope === 'SUPER') {
    return baseSchema.extend({
      municipality: z.string().min(1, t('validation.municipalityRequired')),
    });
  }

  return baseSchema.extend({
    municipality: z.string().optional(),
  });
};

export type ClubFormData = z.infer<ReturnType<typeof createClubSchema>>;






