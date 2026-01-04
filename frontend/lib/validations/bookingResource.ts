import { z } from 'zod';

export const createBookingResourceSchema = (t: (key: string) => string) => {
  return z.object({
    club: z.union([z.string().min(1, t('validation.clubRequired')), z.number().min(1, t('validation.clubRequired'))]),
    name: z.string().min(1, t('validation.nameRequired')),
    resource_type: z.string().min(1, t('validation.typeRequired')),
    description: z.string().min(1, t('validation.descriptionRequired')),
    max_participants: z.union([z.string().min(1, t('validation.maxParticipantsRequired')), z.number().min(1, t('validation.maxParticipantsRequired'))]),
    booking_window_weeks: z.union([z.string().min(1, t('validation.bookingWindowRequired')), z.number().min(1, t('validation.bookingWindowRequired'))]),
    max_bookings_per_user: z.union([z.string().min(1, t('validation.maxBookingsRequired')), z.number().min(1, t('validation.maxBookingsRequired'))]),
    // All other fields are optional
    location: z.string().optional(),
    min_booking_duration: z.number().optional(),
    max_booking_duration: z.number().optional(),
    slot_duration: z.number().optional(),
    buffer_time: z.number().optional(),
    allowed_user_scope: z.string().optional(),
    allowed_group: z.union([z.string(), z.number()]).optional(),
    requires_approval: z.boolean().optional(),
    requires_training: z.boolean().optional(),
    qualification_group: z.union([z.string(), z.number()]).optional(),
    auto_approve_members: z.boolean().optional(),
    cancellation_deadline_hours: z.number().optional(),
    color: z.string().optional(),
    is_active: z.boolean().optional(),
  });
};

export type BookingResourceFormData = z.infer<ReturnType<typeof createBookingResourceSchema>>;




