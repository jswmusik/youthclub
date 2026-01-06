import { z } from 'zod';

/**
 * Validation schema for BookingResource form data.
 * Fields match the BookingResource model in backend/bookings/models.py
 */
export const createBookingResourceSchema = (t: (key: string) => string) => {
  return z.object({
    // Required fields
    club: z.union([z.string().min(1, t('validation.clubRequired')), z.number().min(1, t('validation.clubRequired'))]),
    name: z.string().min(1, t('validation.nameRequired')),
    resource_type: z.string().min(1, t('validation.typeRequired')),
    description: z.string().min(1, t('validation.descriptionRequired')),
    max_participants: z.union([z.string().min(1, t('validation.maxParticipantsRequired')), z.number().min(1, t('validation.maxParticipantsRequired'))]),
    booking_window_weeks: z.union([z.string().min(1, t('validation.bookingWindowRequired')), z.number().min(1, t('validation.bookingWindowRequired'))]),
    max_bookings_per_user_per_week: z.union([z.string().min(1, t('validation.maxBookingsRequired')), z.number().min(0, t('validation.maxBookingsRequired'))]),
    
    // Optional fields that exist in the model
    allowed_user_scope: z.string().optional(),
    allowed_group: z.union([z.string(), z.number()]).optional().nullable(),
    requires_training: z.boolean().optional(),
    qualification_group: z.union([z.string(), z.number()]).optional().nullable(),
    auto_approve: z.boolean().optional(),
    is_active: z.boolean().optional(),
  });
};

export type BookingResourceFormData = z.infer<ReturnType<typeof createBookingResourceSchema>>;






