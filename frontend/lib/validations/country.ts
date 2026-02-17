import { z } from 'zod';

// Factory function that takes the translation function
export const createCountrySchema = (t: (key: string) => string) => {
  return z.object({
    name: z.string().min(1, t('validation.nameRequired')),
    country_code: z.string()
      .min(1, t('validation.countryCodeRequired'))
      .max(5, t('validation.countryCodeMaxLength')),
    description: z.string().min(1, t('validation.descriptionRequired')),
    currency_code: z.string().min(1, t('validation.currencyRequired')),
    default_language: z.string().min(1, t('validation.languageRequired')),
    timezone: z.string().min(1, t('validation.timezoneRequired')),
  });
};

export type CountryFormData = z.infer<ReturnType<typeof createCountrySchema>>;













