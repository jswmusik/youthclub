"""
Image Optimization Utilities for Ungdomsappen

This module provides automatic WebP conversion and optimization for all uploaded images.
It reduces file sizes by 70-90% while maintaining visual quality.

Usage:
    from core.image_utils import optimize_image
    
    optimized_file = optimize_image(uploaded_file, max_width=1920, max_height=1080)
"""

from PIL import Image
from io import BytesIO
from django.core.files.uploadedfile import InMemoryUploadedFile
import sys
import logging

logger = logging.getLogger(__name__)


def optimize_image(uploaded_file, max_width=1920, max_height=1080, quality=85):
    """
    Converts any uploaded image to optimized WebP format.
    
    Features:
    - Converts JPEG/PNG/GIF to WebP (SVG is skipped - already optimized)
    - Resizes if larger than max dimensions (maintains aspect ratio)
    - Compresses with specified quality
    - Handles transparency by converting to white background
    
    Args:
        uploaded_file: Django UploadedFile or similar file object
        max_width: Maximum width in pixels (default: 1920)
        max_height: Maximum height in pixels (default: 1080)
        quality: WebP quality 1-100 (default: 85)
    
    Returns:
        InMemoryUploadedFile: Optimized WebP file, or original file if optimization fails
    """
    # Skip SVGs - they're vector and already optimized
    content_type = getattr(uploaded_file, 'content_type', '')
    file_name = getattr(uploaded_file, 'name', '')
    
    if content_type == 'image/svg+xml' or file_name.lower().endswith('.svg'):
        logger.debug(f"Skipping SVG file: {file_name}")
        return uploaded_file
    
    # Skip PDFs and other documents
    if content_type == 'application/pdf' or file_name.lower().endswith('.pdf'):
        logger.debug(f"Skipping PDF file: {file_name}")
        return uploaded_file
    
    try:
        # Reset file pointer to start
        uploaded_file.seek(0)
        
        # Open image with Pillow
        img = Image.open(uploaded_file)
        original_format = img.format
        
        logger.info(f"Optimizing image: {file_name} ({original_format}, {img.size[0]}x{img.size[1]})")
        
        # Handle different color modes
        if img.mode in ('RGBA', 'LA', 'P'):
            # Convert palette mode to RGBA first
            if img.mode == 'P':
                img = img.convert('RGBA')
            
            # Create white background for transparency
            background = Image.new('RGB', img.size, (255, 255, 255))
            
            # Paste using alpha channel as mask
            if img.mode == 'RGBA':
                background.paste(img, mask=img.split()[3])  # Use alpha channel
            else:
                background.paste(img, mask=img.split()[1])  # Use LA alpha
            
            img = background
        elif img.mode != 'RGB':
            img = img.convert('RGB')
        
        # Resize if too large (maintains aspect ratio)
        original_size = img.size
        img.thumbnail((max_width, max_height), Image.Resampling.LANCZOS)
        
        if img.size != original_size:
            logger.info(f"Resized from {original_size} to {img.size}")
        
        # Save as WebP
        output = BytesIO()
        img.save(output, format='WEBP', quality=quality, optimize=True)
        output.seek(0)
        
        # Calculate size reduction
        original_size_bytes = uploaded_file.size if hasattr(uploaded_file, 'size') else 0
        new_size_bytes = output.getbuffer().nbytes
        
        if original_size_bytes > 0:
            reduction = (1 - new_size_bytes / original_size_bytes) * 100
            logger.info(f"Size reduced by {reduction:.1f}%: {original_size_bytes} -> {new_size_bytes} bytes")
        
        # Generate new filename with .webp extension
        name_without_ext = file_name.rsplit('.', 1)[0] if '.' in file_name else file_name
        new_name = f"{name_without_ext}.webp"
        
        # Create new InMemoryUploadedFile
        return InMemoryUploadedFile(
            file=output,
            field_name=getattr(uploaded_file, 'field_name', 'image'),
            name=new_name,
            content_type='image/webp',
            size=new_size_bytes,
            charset=None
        )
        
    except Exception as e:
        logger.warning(f"Image optimization failed for {file_name}: {e}")
        # Reset file pointer and return original
        try:
            uploaded_file.seek(0)
        except:
            pass
        return uploaded_file


def create_thumbnail(uploaded_file, size=(400, 400), quality=80):
    """
    Creates a smaller thumbnail version of an image.
    Useful for avatars, list views, and previews.
    
    Args:
        uploaded_file: Django UploadedFile
        size: Tuple of (width, height) for max dimensions
        quality: WebP quality 1-100
    
    Returns:
        InMemoryUploadedFile: Thumbnail as WebP
    """
    return optimize_image(
        uploaded_file, 
        max_width=size[0], 
        max_height=size[1], 
        quality=quality
    )


# Size configurations for different image types
SIZE_CONFIGS = {
    # Avatars - small squares
    'avatar': {'max_width': 400, 'max_height': 400, 'quality': 85},
    'author_avatar': {'max_width': 200, 'max_height': 200, 'quality': 85},
    'author_image': {'max_width': 200, 'max_height': 200, 'quality': 85},
    
    # Hero/Banner images - full width
    'hero_image': {'max_width': 1920, 'max_height': 1080, 'quality': 85},
    'hero_background': {'max_width': 1920, 'max_height': 1080, 'quality': 85},
    'background_image': {'max_width': 1920, 'max_height': 1080, 'quality': 85},
    
    # Cover images - medium size
    'cover_image': {'max_width': 1200, 'max_height': 630, 'quality': 85},
    
    # Social/OG images - specific dimensions for social media
    'og_image': {'max_width': 1200, 'max_height': 630, 'quality': 90},
    'twitter_image': {'max_width': 1200, 'max_height': 600, 'quality': 90},
    
    # Content images - general purpose
    'image': {'max_width': 1600, 'max_height': 1200, 'quality': 85},
    'attachment': {'max_width': 1600, 'max_height': 1200, 'quality': 85},
    'media': {'max_width': 1200, 'max_height': 800, 'quality': 85},
    
    # Logos - keep crisp
    'logo': {'max_width': 600, 'max_height': 200, 'quality': 90},
}


def get_size_config(field_name):
    """
    Get optimization config for a field name.
    Falls back to default if field name not found.
    """
    return SIZE_CONFIGS.get(field_name, {'max_width': 1600, 'max_height': 1200, 'quality': 85})









