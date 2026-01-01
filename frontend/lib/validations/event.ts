import { z } from 'zod';

export const createEventSchema = (t: (key: string) => string, isEditing: boolean = false) => {
  return z.object({
    // Required fields
    title: z.string().min(1, t('validation.titleRequired')),
    description: z.string().min(1, t('validation.descriptionRequired')),
    start_date: z.string().min(1, t('validation.startDateRequired')),
    end_date: z.string().min(1, t('validation.endDateRequired')),
    location_name: z.string().min(1, t('validation.locationNameRequired')),
    address: z.string().min(1, t('validation.addressRequired')),
    
    // All other fields are optional
    status: z.string().optional(),
    scheduled_publish_date: z.string().optional(),
    target_audience: z.string().optional(),
    cost: z.string().optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    is_map_visible: z.boolean().optional(),
    max_seats: z.number().optional(),
    max_waitlist: z.number().optional(),
    allow_registration: z.boolean().optional(),
    requires_guardian_approval: z.boolean().optional(),
    requires_admin_approval: z.boolean().optional(),
    registration_close_date: z.string().optional(),
    enable_tickets: z.boolean().optional(),
    send_reminders: z.boolean().optional(),
    target_groups: z.array(z.number()).optional(),
    target_interests: z.array(z.number()).optional(),
    target_genders: z.array(z.string()).optional(),
    target_grades: z.array(z.number()).optional(),
    is_recurring: z.boolean().optional(),
    recurrence_pattern: z.string().optional(),
    recurrence_end_date: z.string().optional(),
    is_global: z.boolean().optional(),
    slug: z.string().optional(),
    meta_description: z.string().optional(),
    meta_tags: z.string().optional(),
    page_title: z.string().optional(),
    og_title: z.string().optional(),
    og_description: z.string().optional(),
    twitter_card_type: z.string().optional(),
    twitter_title: z.string().optional(),
    twitter_description: z.string().optional(),
  }).refine((data) => {
    // Validate that end_date is after start_date
    if (data.start_date && data.end_date) {
      const start = new Date(data.start_date);
      const end = new Date(data.end_date);
      return end > start;
    }
    return true;
  }, {
    message: t('validation.endDateAfterStart'),
    path: ['end_date'],
  }).refine((data) => {
    // Validate that registration_close_date is before start_date
    if (data.registration_close_date && data.start_date) {
      const closeDate = new Date(data.registration_close_date);
      const startDate = new Date(data.start_date);
      return closeDate < startDate;
    }
    return true;
  }, {
    message: t('validation.registrationCloseDateBeforeStart'),
    path: ['registration_close_date'],
  });
};

export type EventFormData = z.infer<ReturnType<typeof createEventSchema>>;

