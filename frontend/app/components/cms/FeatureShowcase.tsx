'use client';

import { motion } from 'framer-motion';
import { FeatureShowcase as FeatureType } from '@/types/cms';
import { cn } from '@/lib/utils';
import { getMediaUrl } from '@/app/utils';

// Animation variants - must match FeatureForm component
const animations: Record<string, { hidden: object; visible: object }> = {
  'fade-up': { 
    hidden: { opacity: 0, y: 50 }, 
    visible: { opacity: 1, y: 0 } 
  },
  'fade-in': { 
    hidden: { opacity: 0 }, 
    visible: { opacity: 1 } 
  },
  'slide-right': { 
    hidden: { opacity: 0, x: -50 }, 
    visible: { opacity: 1, x: 0 } 
  },
  'slide-left': { 
    hidden: { opacity: 0, x: 50 }, 
    visible: { opacity: 1, x: 0 } 
  },
  'zoom-in': { 
    hidden: { opacity: 0, scale: 0.8 }, 
    visible: { opacity: 1, scale: 1 } 
  },
  'bounce-up': { 
    hidden: { opacity: 0, y: 100 }, 
    visible: { opacity: 1, y: 0 } 
  },
  'rotate-in': { 
    hidden: { opacity: 0, rotate: -10, scale: 0.9 }, 
    visible: { opacity: 1, rotate: 0, scale: 1 } 
  },
  'flip-up': { 
    hidden: { opacity: 0, rotateX: 90 }, 
    visible: { opacity: 1, rotateX: 0 } 
  },
};

// Get transition config based on animation type
const getTransition = (animationType: string, delay: number = 0) => {
  const baseTransition = { duration: 0.6, delay };
  
  if (animationType === 'bounce-up') {
    return { ...baseTransition, ease: [0.68, -0.55, 0.265, 1.55] };
  }
  
  if (animationType === 'flip-up') {
    return { ...baseTransition, duration: 0.8, ease: [0.4, 0, 0.2, 1] };
  }
  
  return { ...baseTransition, ease: 'easeOut' };
};

interface FeatureShowcaseProps {
  features: FeatureType[];
  showTitle?: boolean;
  title?: string;
  subtitle?: string;
}

export default function FeatureShowcase({ 
  features, 
  showTitle = false,
  title = "Våra funktioner",
  subtitle = "Upptäck vad som gör oss unika"
}: FeatureShowcaseProps) {
  if (!features || features.length === 0) return null;

  // Filter to only show active features
  const activeFeatures = features.filter(f => f.is_active);
  
  if (activeFeatures.length === 0) return null;

  return (
    <div className="py-16 md:py-24 overflow-hidden">
      {showTitle && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-16">
          <motion.h2 
            className="text-3xl md:text-5xl font-bold text-[var(--brand-light)] mb-4 font-heading"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <span className="bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-purple)] bg-clip-text text-transparent">
              {title}
            </span>
          </motion.h2>
          <motion.p 
            className="text-lg text-[var(--brand-light)]/60 max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            {subtitle}
          </motion.p>
        </div>
      )}

      <div className="space-y-24 md:space-y-32">
        {/* Features are already ordered by the backend (PageFeature.order), don't re-sort */}
        {activeFeatures.map((feature, index) => (
          <FeatureBlock key={feature.id} feature={feature} index={index} />
        ))}
      </div>
    </div>
  );
}

function FeatureBlock({ feature, index }: { feature: FeatureType; index: number }) {
  const isRight = feature.layout === 'right' || (feature.layout !== 'left' && index % 2 !== 0);
  const anim = animations[feature.animation_type] || animations['fade-up'];
  const mediaUrl = getMediaUrl(feature.media);
  const transition = getTransition(feature.animation_type);

  // Grid layout
  if (feature.layout === 'grid') {
    return (
      <motion.div 
        className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-50px" }}
        transition={transition}
        variants={anim}
        style={{ perspective: 1000 }} // For 3D transforms
      >
        <div className="bg-[var(--dark-800)] rounded-3xl border border-[var(--dark-600)] overflow-hidden">
          <div className="aspect-video relative">
            {feature.media_type === 'video' ? (
              <video 
                src={mediaUrl} 
                autoPlay 
                loop 
                muted 
                playsInline 
                className="w-full h-full object-cover"
              />
            ) : (
              <img 
                src={mediaUrl} 
                alt={feature.alt_text} 
                className="w-full h-full object-cover"
              />
            )}
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--dark-800)] via-transparent to-transparent" />
          </div>
          <div className="p-6 md:p-8 -mt-20 relative z-10">
            <h3 className="text-2xl md:text-3xl font-bold text-[var(--brand-light)] mb-3 font-heading">
              {feature.title}
            </h3>
            <p className="text-[var(--brand-light)]/70 text-lg leading-relaxed">
              {feature.description}
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  // Left/Right layout
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8" style={{ perspective: 1000 }}>
      <div className={cn(
        "flex flex-col md:flex-row items-center gap-8 md:gap-16",
        isRight ? "md:flex-row-reverse" : ""
      )}>
        
        {/* Text Side */}
        <motion.div 
          className="flex-1 space-y-6"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          transition={getTransition(feature.animation_type, 0.1)}
          variants={anim}
        >
          <h3 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[var(--brand-light)] font-heading leading-tight">
            {feature.title}
          </h3>
          <p className="text-lg text-[var(--brand-light)]/70 leading-relaxed">
            {feature.description}
          </p>
        </motion.div>

        {/* Media Side */}
        <motion.div 
          className="flex-1 w-full"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          variants={{
            hidden: { opacity: 0, scale: 0.95 },
            visible: { opacity: 1, scale: 1 }
          }}
        >
          <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-[var(--dark-700)] border border-[var(--dark-600)]">
            {/* Decorative gradient */}
            <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-[var(--brand-primary)]/20 blur-3xl" />
            <div className="absolute -bottom-20 -left-20 w-40 h-40 rounded-full bg-[var(--brand-purple)]/20 blur-3xl" />
            
            <div className="relative aspect-video md:aspect-[4/3]">
              {feature.media_type === 'video' ? (
                <video 
                  src={mediaUrl} 
                  autoPlay 
                  loop 
                  muted 
                  playsInline 
                  className="w-full h-full object-cover"
                />
              ) : (
                <img 
                  src={mediaUrl} 
                  alt={feature.alt_text} 
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                />
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
