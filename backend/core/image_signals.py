"""
Image Optimization Signal Handlers for Ungdomsappen

This module automatically optimizes images to WebP format when they are uploaded
to any model field. It uses Django signals to intercept saves before they happen.

The optimization is:
- Non-destructive: Only affects NEW uploads, not existing images
- Graceful: Falls back to original file if optimization fails
- Configurable: Different sizes for different field types

To add a new model/field for optimization, add it to IMAGE_FIELDS_TO_OPTIMIZE below.
"""

import logging
from django.db.models.signals import pre_save
from django.dispatch import receiver
from core.image_utils import optimize_image, get_size_config

logger = logging.getLogger(__name__)


# =============================================================================
# CONFIGURATION: Define which models and fields should be optimized
# =============================================================================

IMAGE_FIELDS_TO_OPTIMIZE = {
    # Organization app
    'organization.Country': ['avatar'],
    'organization.Municipality': ['avatar', 'hero_image'],
    'organization.Club': ['avatar', 'hero_image'],
    'organization.Interest': ['avatar'],
    
    # Users app
    'users.User': ['avatar', 'background_image'],
    # Note: id_document is NOT optimized (needs original for verification)
    
    # Events app
    'events.Event': ['cover_image', 'og_image', 'twitter_image'],
    'events.EventImage': ['image'],
    
    # Posts app
    'posts.PostImage': ['image'],
    
    # Messenger app
    'messenger.Message': ['attachment'],
    
    # CMS app
    'cms.Page': ['hero_image', 'author_image', 'og_image'],
    'cms.FeatureShowcase': ['media'],
    
    # Marketing app
    'marketing.SiteSEOSettings': ['hero_background', 'og_image'],
    'marketing.Testimonial': ['author_avatar'],
    'marketing.Customer': ['logo'],
    
    # Inventory app
    'inventory.Item': ['image'],
    
    # Groups app
    'groups.Group': ['avatar', 'background_image'],
    
    # Learning app
    'learning.Course': ['cover_image'],
    # Note: ContentItem.file_upload is NOT optimized (may be PDF/docs)
    
    # Bookings app
    'bookings.BookingResource': ['image'],
    
    # Rewards app
    'rewards.Reward': ['image'],
    
    # News app
    'news.NewsArticle': ['hero_image'],
    
    # Questionnaires app
    'questionnaires.Question': ['image'],
}


# =============================================================================
# SIGNAL HANDLER
# =============================================================================

def _is_new_file_upload(instance, field_name, model_class):
    """
    Check if the field contains a newly uploaded file (not an existing one).
    
    Returns True if:
    - This is a new object (no pk yet)
    - The file field has changed from what's in the database
    """
    field_value = getattr(instance, field_name, None)
    
    # No file? Nothing to optimize
    if not field_value:
        return False
    
    # Check if the file has a 'file' attribute (indicates it's an uploaded file)
    if not hasattr(field_value, 'file'):
        return False
    
    # For new objects, always process the upload
    if not instance.pk:
        return True
    
    # For existing objects, check if the file actually changed
    try:
        old_instance = model_class.objects.get(pk=instance.pk)
        old_value = getattr(old_instance, field_name, None)
        
        # If old value is empty/None, this is a new upload
        if not old_value:
            return True
        
        # Compare file names - if different, it's a new upload
        old_name = getattr(old_value, 'name', None)
        new_name = getattr(field_value, 'name', None)
        
        # If names are exactly the same, no new upload
        if old_name == new_name:
            return False
        
        # File name changed, could be a new upload
        # But we need to be more careful - check if it's actually a file object
        try:
            # Try to read from the file - if it works, it's a new upload
            field_value.file.seek(0)
            return True
        except:
            return False
            
    except model_class.DoesNotExist:
        # Object doesn't exist yet, treat as new upload
        return True
    except Exception as e:
        logger.warning(f"Error checking file change for {model_class.__name__}.{field_name}: {e}")
        return False


def optimize_model_images(sender, instance, **kwargs):
    """
    Signal handler that optimizes image fields before saving.
    
    This is connected to pre_save for each model in IMAGE_FIELDS_TO_OPTIMIZE.
    """
    model_path = f"{sender._meta.app_label}.{sender._meta.object_name}"
    fields = IMAGE_FIELDS_TO_OPTIMIZE.get(model_path, [])
    
    for field_name in fields:
        try:
            if _is_new_file_upload(instance, field_name, sender):
                field_value = getattr(instance, field_name)
                
                # Get the uploaded file
                uploaded_file = field_value.file
                
                # Get size config for this field type
                config = get_size_config(field_name)
                
                logger.info(f"Optimizing {model_path}.{field_name} with config: {config}")
                
                # Optimize the image
                optimized = optimize_image(
                    uploaded_file,
                    max_width=config['max_width'],
                    max_height=config['max_height'],
                    quality=config['quality']
                )
                
                # Replace the field value with optimized file
                setattr(instance, field_name, optimized)
                
                logger.info(f"Successfully optimized {model_path}.{field_name}")
                
        except Exception as e:
            logger.warning(f"Failed to optimize {model_path}.{field_name}: {e}")
            # Don't fail the save - just use the original file


def connect_image_optimization_signals():
    """
    Connect the image optimization signal handler to all configured models.
    
    This is called from CoreConfig.ready() to set up signals after all apps are loaded.
    """
    from django.apps import apps
    
    for model_path, fields in IMAGE_FIELDS_TO_OPTIMIZE.items():
        try:
            app_label, model_name = model_path.split('.')
            model = apps.get_model(app_label, model_name)
            
            # Connect signal with a unique dispatch_uid to prevent duplicate connections
            pre_save.connect(
                optimize_model_images,
                sender=model,
                dispatch_uid=f"image_optimization_{model_path}"
            )
            
            logger.debug(f"Connected image optimization for {model_path}: {fields}")
            
        except LookupError:
            logger.warning(f"Model not found: {model_path}")
        except Exception as e:
            logger.error(f"Error connecting signal for {model_path}: {e}")
    
    logger.info(f"Image optimization signals connected for {len(IMAGE_FIELDS_TO_OPTIMIZE)} models")









