'use client';

import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
}

// Base Skeleton component with shimmer effect
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div className={cn('skeleton-shimmer rounded', className)} />
  );
}

// Post Card Skeleton
export function PostCardSkeleton() {
  return (
    <div className="bg-[var(--dark-900)] border-t border-[var(--dark-500)]">
      <div className="p-4">
        {/* Header: Avatar + Name + Date */}
        <div className="flex items-center gap-3 mb-4">
          <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <Skeleton className="h-4 w-32 mb-2 rounded-md" />
            <Skeleton className="h-3 w-20 rounded-md" />
          </div>
          <Skeleton className="w-8 h-8 rounded-lg flex-shrink-0" />
        </div>
        
        {/* Content Lines */}
        <div className="space-y-2 mb-4">
          <Skeleton className="h-4 w-full rounded-md" />
          <Skeleton className="h-4 w-4/5 rounded-md" />
          <Skeleton className="h-4 w-3/5 rounded-md" />
        </div>
        
        {/* Image Placeholder */}
        <Skeleton className="h-48 sm:h-64 w-full rounded-xl mb-4" />
        
        {/* Action Bar */}
        <div className="flex items-center gap-4 pt-2">
          <Skeleton className="h-8 w-16 rounded-lg" />
          <Skeleton className="h-8 w-16 rounded-lg" />
          <Skeleton className="h-8 w-16 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

// Post Card Skeleton without image (for text-only posts)
export function PostCardSkeletonCompact() {
  return (
    <div className="bg-[var(--dark-900)] border-t border-[var(--dark-500)]">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
          <div className="flex-1">
            <Skeleton className="h-4 w-28 mb-2 rounded-md" />
            <Skeleton className="h-3 w-16 rounded-md" />
          </div>
        </div>
        
        {/* Content */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-full rounded-md" />
          <Skeleton className="h-4 w-3/4 rounded-md" />
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-4 pt-4">
          <Skeleton className="h-8 w-16 rounded-lg" />
          <Skeleton className="h-8 w-16 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

// Event Card Skeleton
export function EventCardSkeleton() {
  return (
    <div className="bg-[var(--dark-800)] rounded-none sm:rounded-xl border-y sm:border border-[var(--dark-500)] overflow-hidden">
      <div className="flex">
        {/* Date Column */}
        <div className="w-20 sm:w-24 flex-shrink-0 p-3 sm:p-4 flex flex-col items-center justify-center">
          <Skeleton className="h-6 w-12 mb-1 rounded-md" />
          <Skeleton className="h-8 w-10 mb-1 rounded-md" />
          <Skeleton className="h-4 w-8 rounded-md" />
        </div>
        
        {/* Content */}
        <div className="flex-1 p-3 sm:p-4">
          <Skeleton className="h-5 w-3/4 mb-2 rounded-md" />
          <Skeleton className="h-4 w-1/2 mb-3 rounded-md" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        </div>
        
        {/* Arrow */}
        <div className="w-10 flex items-center justify-center">
          <Skeleton className="w-6 h-6 rounded-full" />
        </div>
      </div>
    </div>
  );
}

// Questionnaire Card Skeleton
export function QuestionnaireCardSkeleton() {
  return (
    <div className="bg-[var(--dark-700)] rounded-none sm:rounded-xl border-y sm:border border-[var(--dark-500)] p-4 sm:p-6">
      <div className="flex items-start gap-4">
        <Skeleton className="w-12 h-12 rounded-xl flex-shrink-0" />
        <div className="flex-1">
          <Skeleton className="h-5 w-2/3 mb-2 rounded-md" />
          <Skeleton className="h-4 w-full mb-1 rounded-md" />
          <Skeleton className="h-4 w-4/5 mb-4 rounded-md" />
          <Skeleton className="h-10 w-32 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

// Reward Card Skeleton
export function RewardCardSkeleton() {
  return (
    <div className="bg-[var(--dark-600)] rounded-none sm:rounded-xl border-y sm:border border-[var(--dark-400)] p-6">
      <div className="flex items-center gap-4">
        <Skeleton className="w-16 h-16 rounded-lg flex-shrink-0" />
        <div className="flex-1">
          <Skeleton className="h-6 w-40 mb-2 rounded-md" />
          <Skeleton className="h-4 w-full rounded-md" />
        </div>
      </div>
      <Skeleton className="h-10 w-full mt-4 rounded-lg" />
    </div>
  );
}

// Recommended Clubs/Groups Skeleton
export function RecommendedSectionSkeleton() {
  return (
    <div className="bg-[var(--dark-700)] rounded-none sm:rounded-xl border-y sm:border border-[var(--dark-500)] p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-5 w-40 rounded-md" />
        <div className="flex gap-2">
          <Skeleton className="w-8 h-8 rounded-full" />
          <Skeleton className="w-8 h-8 rounded-full" />
        </div>
      </div>
      
      {/* Cards */}
      <div className="flex gap-4 overflow-hidden">
        {[1, 2, 3].map((i) => (
          <div key={i} className="w-40 flex-shrink-0">
            <Skeleton className="h-24 w-full rounded-xl mb-2" />
            <Skeleton className="h-4 w-3/4 rounded-md mb-1" />
            <Skeleton className="h-3 w-1/2 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}

// Welcome Banner Skeleton
export function WelcomeBannerSkeleton() {
  return (
    <div className="relative bg-[var(--dark-700)] rounded-none sm:rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8 overflow-hidden border-y sm:border border-[var(--dark-500)]">
      <div className="absolute top-0 left-0 right-0 h-1 skeleton-shimmer" />
      <Skeleton className="h-8 w-48 mb-2 rounded-md" />
      <Skeleton className="h-4 w-72 rounded-md" />
    </div>
  );
}

// Right Sidebar Skeleton
export function SidebarCardSkeleton() {
  return (
    <div className="bg-[var(--dark-700)] rounded-xl border border-[var(--dark-500)] p-6">
      <Skeleton className="h-5 w-32 mb-4 rounded-md" />
      <div className="space-y-3">
        <Skeleton className="h-4 w-full rounded-md" />
        <Skeleton className="h-4 w-3/4 rounded-md" />
        <Skeleton className="h-4 w-1/2 rounded-md" />
      </div>
    </div>
  );
}

// Club Card Skeleton (for preferred club)
export function ClubCardSkeleton() {
  return (
    <div className="bg-[var(--dark-700)] rounded-xl border border-[var(--dark-500)] overflow-hidden">
      <Skeleton className="h-20 w-full" />
      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <Skeleton className="w-12 h-12 rounded-xl flex-shrink-0" />
          <div className="flex-1">
            <Skeleton className="h-5 w-32 mb-1 rounded-md" />
            <Skeleton className="h-3 w-20 rounded-md" />
          </div>
        </div>
        <Skeleton className="h-9 w-full rounded-lg" />
      </div>
    </div>
  );
}

// Full Dashboard Feed Skeleton (combines multiple skeletons)
export function DashboardFeedSkeleton() {
  return (
    <div className="space-y-0">
      {/* First post with image */}
      <PostCardSkeleton />
      
      {/* Recommended Section */}
      <div className="my-6">
        <RecommendedSectionSkeleton />
      </div>
      
      {/* Text-only posts */}
      <PostCardSkeletonCompact />
      <PostCardSkeletonCompact />
      
      {/* Event card */}
      <div className="my-6">
        <EventCardSkeleton />
      </div>
      
      {/* More posts */}
      <PostCardSkeleton />
      
      {/* Another recommended section */}
      <div className="my-6">
        <RecommendedSectionSkeleton />
      </div>
      
      <PostCardSkeletonCompact />
    </div>
  );
}

// News Card Skeleton
export function NewsCardSkeleton() {
  return (
    <div className="bg-[var(--dark-800)] rounded-none sm:rounded-xl border-y sm:border border-[var(--dark-600)] overflow-hidden">
      {/* Image */}
      <Skeleton className="h-48 w-full" />
      
      {/* Content */}
      <div className="p-4">
        {/* Tags */}
        <div className="flex gap-2 mb-3">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        
        {/* Title */}
        <Skeleton className="h-5 w-full rounded-md mb-2" />
        <Skeleton className="h-5 w-3/4 rounded-md mb-3" />
        
        {/* Excerpt */}
        <Skeleton className="h-4 w-full rounded-md mb-1" />
        <Skeleton className="h-4 w-5/6 rounded-md mb-4" />
        
        {/* Meta */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-24 rounded-md" />
          <Skeleton className="h-3 w-20 rounded-md" />
        </div>
      </div>
    </div>
  );
}

// News Hero Skeleton
export function NewsHeroSkeleton() {
  return (
    <div className="relative h-80 sm:h-96 rounded-none sm:rounded-2xl overflow-hidden mb-6 border-y sm:border border-[var(--dark-600)]">
      <Skeleton className="absolute inset-0" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-6">
        <div className="flex gap-2 mb-3">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
        <Skeleton className="h-8 w-3/4 rounded-md mb-2" />
        <Skeleton className="h-8 w-1/2 rounded-md mb-3" />
        <Skeleton className="h-4 w-32 rounded-md" />
      </div>
    </div>
  );
}

// News Page Skeleton
export function NewsPageSkeleton() {
  return (
    <div>
      {/* Header */}
      <div className="mb-6 px-4 sm:px-0 pt-4 sm:pt-0">
        <div className="flex items-center gap-3 mb-1">
          <Skeleton className="w-7 h-7 rounded-lg" />
          <Skeleton className="h-8 sm:h-10 w-48 rounded-md" />
        </div>
        <div className="pl-10">
          <Skeleton className="h-4 w-64 rounded-md" />
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] p-4 mb-6">
        {/* Search Bar */}
        <Skeleton className="h-12 w-full rounded-xl mb-4" />

        {/* Tags Filter */}
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-9 w-24 rounded-xl" />
          <Skeleton className="h-9 w-20 rounded-xl" />
          <Skeleton className="h-9 w-28 rounded-xl" />
          <Skeleton className="h-9 w-16 rounded-xl" />
          <Skeleton className="h-9 w-24 rounded-xl" />
        </div>
      </div>

      {/* Hero Skeleton */}
      <NewsHeroSkeleton />

      {/* News Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
        <NewsCardSkeleton />
        <NewsCardSkeleton />
        <NewsCardSkeleton />
        <NewsCardSkeleton />
        <NewsCardSkeleton />
        <NewsCardSkeleton />
      </div>
    </div>
  );
}

// Wallet Reward Card Skeleton
export function WalletRewardCardSkeleton() {
  return (
    <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-500)] overflow-hidden">
      {/* Image Section */}
      <Skeleton className="h-40 w-full" />
      
      {/* Ticket punch holes */}
      <div className="relative">
        <div className="absolute -top-2 -left-2 w-5 h-5 rounded-full bg-[var(--dark-900)] border-2 border-[var(--dark-500)]" />
        <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-[var(--dark-900)] border-2 border-[var(--dark-500)]" />
        <div className="border-t-2 border-dashed border-[var(--dark-500)]" />
      </div>
      
      {/* Content Section */}
      <div className="p-5">
        <Skeleton className="h-5 w-3/4 rounded-md mb-2" /> {/* Title */}
        <Skeleton className="h-3 w-full rounded-md mb-1" /> {/* Description line 1 */}
        <Skeleton className="h-3 w-2/3 rounded-md mb-3" /> {/* Description line 2 */}
        <Skeleton className="h-3 w-24 rounded-md mb-3" /> {/* Sponsor */}
        <Skeleton className="h-10 w-full rounded-xl" /> {/* Button */}
      </div>
    </div>
  );
}

// Wallet Page Skeleton
export function WalletPageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Skeleton className="w-6 h-6 rounded-lg" />
          <Skeleton className="h-8 w-32 rounded-md" />
        </div>
        <Skeleton className="h-9 w-28 rounded-xl" />
      </div>

      {/* Rewards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <WalletRewardCardSkeleton />
        <WalletRewardCardSkeleton />
        <WalletRewardCardSkeleton />
      </div>
    </div>
  );
}

// Events Page Skeleton
export function EventsPageSkeleton() {
  return (
    <div>
      {/* Header Section */}
      <div className="px-4 sm:px-0 mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
          <div>
            <div className="flex items-center gap-2 sm:gap-3 mb-1">
              <Skeleton className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg" />
              <Skeleton className="h-8 sm:h-10 w-48 sm:w-56 rounded-md" />
            </div>
            <div className="pl-9">
              <Skeleton className="h-4 w-40 rounded-md" />
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Skeleton className="h-10 w-36 rounded-xl" />
            <Skeleton className="h-10 w-28 rounded-xl" />
          </div>
        </div>

        {/* Search & Filters */}
        <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] px-4 py-3 sm:p-4 -mx-4 sm:mx-0">
          {/* Search Bar */}
          <Skeleton className="h-12 w-full rounded-xl mb-3" />

          {/* Filter Chips */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Sort Options */}
            <div className="flex items-center gap-1 mr-2 pr-2 border-r border-[var(--dark-500)]">
              <Skeleton className="w-3.5 h-3.5 rounded" />
              <Skeleton className="h-6 w-16 rounded-md" />
              <Skeleton className="h-6 w-16 rounded-md" />
              <Skeleton className="h-6 w-20 rounded-md" />
            </div>
            <Skeleton className="h-7 w-16 rounded-lg" />
            <Skeleton className="h-7 w-20 rounded-lg" />
            <Skeleton className="h-7 w-20 rounded-lg" />
            <Skeleton className="h-7 w-24 rounded-lg" />
          </div>
        </div>
      </div>

      {/* Events List */}
      <div className="space-y-2 sm:space-y-3">
        <EventCardSkeleton />
        <EventCardSkeleton />
        <EventCardSkeleton />
        <EventCardSkeleton />
        <EventCardSkeleton />
      </div>
    </div>
  );
}

// Notification Item Skeleton
export function NotificationItemSkeleton() {
  return (
    <div className="bg-[var(--dark-800)] rounded-none sm:rounded-xl border-y sm:border border-[var(--dark-600)] p-4">
      <div className="flex items-start gap-3">
        {/* Icon */}
        <Skeleton className="w-10 h-10 rounded-xl flex-shrink-0" />
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <Skeleton className="h-4 w-32 rounded-md" />
            <Skeleton className="h-3 w-16 rounded-md" />
          </div>
          <Skeleton className="h-4 w-full rounded-md mb-1" />
          <Skeleton className="h-4 w-3/4 rounded-md" />
        </div>
        
        {/* Unread indicator */}
        <Skeleton className="w-2 h-2 rounded-full flex-shrink-0" />
      </div>
    </div>
  );
}

// Notifications Page Skeleton
export function NotificationsPageSkeleton() {
  return (
    <div>
      {/* Header Section */}
      <div className="mb-4 sm:mb-6 px-4 sm:px-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
          <div>
            <div className="flex items-center gap-2 sm:gap-3 mb-1">
              <Skeleton className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg" />
              <Skeleton className="h-8 sm:h-10 w-40 sm:w-48 rounded-md" />
            </div>
            <div className="pl-9">
              <Skeleton className="h-4 w-32 rounded-md" />
            </div>
          </div>
          <Skeleton className="h-10 w-32 rounded-xl" />
        </div>

        {/* Filter Chips */}
        <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] px-4 py-3 sm:p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-7 w-16 rounded-lg" />
            <Skeleton className="h-7 w-20 rounded-lg" />
            <Skeleton className="h-7 w-20 rounded-lg" />
            <Skeleton className="h-7 w-18 rounded-lg" />
            <Skeleton className="h-7 w-16 rounded-lg" />
            <Skeleton className="h-7 w-16 rounded-lg" />
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        <NotificationItemSkeleton />
        <NotificationItemSkeleton />
        <NotificationItemSkeleton />
        <NotificationItemSkeleton />
        <NotificationItemSkeleton />
      </div>
    </div>
  );
}

// Message Conversation Item Skeleton
export function ConversationItemSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3 border-b border-[var(--dark-500)]">
      <Skeleton className="w-12 h-12 rounded-full flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <Skeleton className="h-4 w-28 rounded-md" />
          <Skeleton className="h-3 w-12 rounded-md" />
        </div>
        <Skeleton className="h-3 w-full rounded-md" />
      </div>
    </div>
  );
}

// Messages Page Skeleton
export function MessagesPageSkeleton() {
  return (
    <div className="flex h-full md:rounded-2xl overflow-hidden w-full md:max-w-6xl lg:max-w-7xl md:mx-auto bg-[var(--dark-800)] md:border md:border-[var(--dark-500)]">
      {/* Left Column - Conversation List */}
      <div className="flex-shrink-0 w-full md:w-80 lg:w-96 flex flex-col h-full border-r border-[var(--dark-500)]">
        {/* Header */}
        <div className="p-3 sm:p-4 border-b border-[var(--dark-500)] bg-[var(--dark-700)]">
          <div className="flex justify-between items-center mb-3">
            <Skeleton className="h-6 w-24 rounded-md" />
            <Skeleton className="w-8 h-8 rounded-lg" />
          </div>
          
          {/* Search Field */}
          <Skeleton className="h-10 w-full rounded-lg mb-3" />
          
          {/* New Message Button */}
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
        
        {/* Conversation List */}
        <div className="flex-1 overflow-hidden">
          <ConversationItemSkeleton />
          <ConversationItemSkeleton />
          <ConversationItemSkeleton />
          <ConversationItemSkeleton />
          <ConversationItemSkeleton />
          <ConversationItemSkeleton />
        </div>
      </div>
      
      {/* Right Column - Empty State (Desktop Only) */}
      <div className="hidden md:flex flex-1 items-center justify-center bg-[var(--dark-900)]">
        <div className="text-center">
          <Skeleton className="w-16 h-16 rounded-2xl mx-auto mb-4" />
          <Skeleton className="h-5 w-48 mx-auto mb-2 rounded-md" />
          <Skeleton className="h-4 w-64 mx-auto rounded-md" />
        </div>
      </div>
    </div>
  );
}

// Resource Card Skeleton (for booking resources)
export function ResourceCardSkeleton() {
  return (
    <div className="bg-[var(--dark-800)] rounded-xl border border-[var(--dark-600)] overflow-hidden">
      {/* Image placeholder */}
      <Skeleton className="h-36 w-full" />
      
      {/* Content */}
      <div className="p-4">
        {/* Title */}
        <Skeleton className="h-5 w-3/4 rounded-md mb-2" />
        
        {/* Club name */}
        <Skeleton className="h-4 w-1/2 rounded-md mb-3" />
        
        {/* Info badges */}
        <div className="flex items-center gap-2 mb-4">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
        
        {/* Button */}
        <Skeleton className="h-10 w-full rounded-xl" />
      </div>
    </div>
  );
}

// New Booking Page Skeleton (Browse Resources)
export function NewBookingPageSkeleton() {
  return (
    <div>
      {/* Header Section */}
      <div className="mb-4 sm:mb-6 px-4 sm:px-0 pt-4 sm:pt-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
          <div>
            <div className="flex items-center gap-2 sm:gap-3 mb-1">
              <Skeleton className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg" />
              <Skeleton className="h-8 sm:h-10 w-40 sm:w-48 rounded-md" />
            </div>
            <div className="pl-8 sm:pl-10">
              <Skeleton className="h-4 w-64 rounded-md" />
            </div>
          </div>
        </div>

        {/* Filters Section */}
        <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] p-3 sm:p-4">
          {/* Search Bar */}
          <Skeleton className="h-12 w-full rounded-xl mb-3" />

          {/* Filter Chips */}
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-8 w-24 rounded-lg" />
            <Skeleton className="h-8 w-28 rounded-lg" />
          </div>
        </div>
      </div>

      {/* Resources Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 px-4 sm:px-0">
        <ResourceCardSkeleton />
        <ResourceCardSkeleton />
        <ResourceCardSkeleton />
        <ResourceCardSkeleton />
        <ResourceCardSkeleton />
        <ResourceCardSkeleton />
      </div>
    </div>
  );
}

// Booking Card Skeleton
export function BookingCardSkeleton() {
  return (
    <div className="bg-[var(--dark-800)] rounded-xl border border-[var(--dark-600)] p-4">
      <div className="flex items-start gap-4">
        {/* Status indicator */}
        <Skeleton className="w-1 h-16 rounded-full flex-shrink-0" />
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex-1">
              <Skeleton className="h-5 w-48 rounded-md mb-2" />
              <Skeleton className="h-4 w-32 rounded-md" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full flex-shrink-0" />
          </div>
          
          {/* Date/Time info */}
          <div className="mt-3 p-3 bg-[var(--dark-700)] rounded-lg">
            <div className="flex items-center gap-4">
              <Skeleton className="h-4 w-28 rounded-md" />
              <Skeleton className="h-4 w-24 rounded-md" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Bookings Page Skeleton
export function BookingsPageSkeleton() {
  return (
    <div>
      {/* Header Section */}
      <div className="mb-4 sm:mb-6 px-4 sm:px-0 pt-4 sm:pt-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
          <div>
            <div className="flex items-center gap-2 sm:gap-3 mb-1">
              <Skeleton className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg" />
              <Skeleton className="h-8 sm:h-10 w-40 sm:w-48 rounded-md" />
            </div>
            <div className="pl-8 sm:pl-10">
              <Skeleton className="h-4 w-44 rounded-md" />
            </div>
          </div>
          <Skeleton className="h-10 w-32 rounded-xl" />
        </div>

        {/* Filters Section */}
        <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] p-3 sm:p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-8 w-24 rounded-lg" />
            <Skeleton className="h-8 w-20 rounded-lg" />
            <Skeleton className="h-8 w-24 rounded-lg" />
          </div>
        </div>
      </div>

      {/* Bookings List */}
      <div className="space-y-3 px-4 sm:px-0">
        <BookingCardSkeleton />
        <BookingCardSkeleton />
        <BookingCardSkeleton />
        <BookingCardSkeleton />
      </div>
    </div>
  );
}

// Inventory Card Skeleton
export function InventoryCardSkeleton() {
  return (
    <div className="bg-[var(--dark-800)] rounded-xl border border-[var(--dark-600)] overflow-hidden">
      {/* Image placeholder */}
      <Skeleton className="h-40 w-full" />
      
      {/* Content */}
      <div className="p-4">
        {/* Category badge */}
        <Skeleton className="h-5 w-20 rounded-full mb-2" />
        
        {/* Title */}
        <Skeleton className="h-5 w-3/4 rounded-md mb-2" />
        
        {/* Description */}
        <Skeleton className="h-4 w-full rounded-md mb-1" />
        <Skeleton className="h-4 w-2/3 rounded-md mb-4" />
        
        {/* Status badges */}
        <div className="flex gap-2 mb-4">
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
        
        {/* Button */}
        <Skeleton className="h-10 w-full rounded-xl" />
      </div>
    </div>
  );
}

// Inventory Page Skeleton
export function InventoryPageSkeleton() {
  return (
    <div>
      {/* Header Section */}
      <div className="mb-4 sm:mb-6 px-4 sm:px-0 pt-4 sm:pt-0">
        <div className="flex items-center gap-2 sm:gap-3 mb-2">
          <Skeleton className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg" />
          <Skeleton className="h-8 sm:h-10 w-40 sm:w-52 rounded-md" />
        </div>
        <div className="ml-8 sm:ml-10">
          <Skeleton className="h-8 w-48 rounded-xl" />
        </div>
      </div>

      {/* Filters Section */}
      <div className="mb-4 sm:mb-6 bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-600)] p-3 sm:p-4">
        {/* Search Bar */}
        <Skeleton className="h-12 w-full rounded-xl mb-3" />

        {/* Category Filter Chips */}
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-8 w-28 rounded-lg" />
          <Skeleton className="h-8 w-20 rounded-lg" />
          <Skeleton className="h-8 w-24 rounded-lg" />
          <Skeleton className="h-8 w-20 rounded-lg" />
          <Skeleton className="h-8 w-28 rounded-lg" />
        </div>
      </div>
      
      {/* Results Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-4 px-4 sm:px-0">
        <InventoryCardSkeleton />
        <InventoryCardSkeleton />
        <InventoryCardSkeleton />
        <InventoryCardSkeleton />
        <InventoryCardSkeleton />
        <InventoryCardSkeleton />
      </div>
    </div>
  );
}

// Scan Page Skeleton
export function ScanPageSkeleton() {
  return (
    <div className="flex flex-col items-center">
      {/* Header */}
      <div className="mb-6 sm:mb-8 text-center">
        <Skeleton className="w-16 h-16 rounded-2xl mx-auto mb-4" />
        <Skeleton className="h-8 w-32 mx-auto mb-2 rounded-md" />
        <Skeleton className="h-4 w-64 mx-auto rounded-md" />
      </div>

      {/* Scanner Card */}
      <div className="w-full max-w-md mx-auto bg-[var(--dark-800)] border border-[var(--dark-600)] rounded-none sm:rounded-2xl overflow-hidden">
        {/* Header Bar */}
        <div className="p-4 bg-[var(--dark-700)]">
          <Skeleton className="h-6 w-36 mx-auto rounded-md" />
        </div>
        
        {/* Scanner Area */}
        <div className="p-4">
          <div className="aspect-square w-full max-w-xs mx-auto relative">
            <Skeleton className="w-full h-full rounded-xl" />
            {/* Scanner frame corners */}
            <div className="absolute inset-4 border-2 border-[var(--brand-primary)]/30 rounded-lg pointer-events-none">
              <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-[var(--brand-primary)] rounded-tl-lg" />
              <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-[var(--brand-primary)] rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-[var(--brand-primary)] rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-[var(--brand-primary)] rounded-br-lg" />
            </div>
          </div>
          
          {/* Buttons placeholder */}
          <div className="mt-4 flex justify-center gap-3">
            <Skeleton className="h-10 w-28 rounded-xl" />
            <Skeleton className="h-10 w-28 rounded-xl" />
          </div>
        </div>
      </div>

      {/* Cancel button */}
      <Skeleton className="h-5 w-40 mt-6 sm:mt-8 rounded-md" />
    </div>
  );
}

export default Skeleton;

