'use client';

import { useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';
import 'react-quill-new/dist/quill.snow.css'; // Import Quill styles
import { learningApi } from '@/lib/learning-api';
import { getMediaUrl } from '@/app/utils';
import toast from 'react-hot-toast';

// Dynamically import ReactQuill with SSR disabled
const ReactQuill = dynamic(() => import('react-quill-new'), { 
  ssr: false,
  loading: () => <p>Loading Editor...</p>
});

interface EditorProps {
  value: string;
  onChange: (content: string) => void;
}

export default function RichTextEditor({ value, onChange }: EditorProps) {
  const quillRef = useRef<any>(null);

  const uploadImageFile = async (file: File, index: number) => {
    const quill = quillRef.current?.getEditor();
    if (!quill) return;

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    // Insert placeholder
    quill.insertText(index, 'Uploading image...', 'user');
    quill.setSelection(index + 20);

    try {
      // Upload image
      const response = await learningApi.uploadImage(file);
      
      // Get image URL from response
      let imageUrl = '';
      if (response.url) {
        // Backend returns full URL with /media/ prefix
        imageUrl = getMediaUrl(response.url) || response.url;
      } else if (response.image) {
        // Fallback to image field (relative path)
        imageUrl = getMediaUrl(response.image) || response.image;
      } else if (typeof response === 'string') {
        imageUrl = getMediaUrl(response) || response;
      }

      if (!imageUrl) {
        throw new Error('No image URL returned from server');
      }
      
      // Ensure we have a full URL
      if (!imageUrl.startsWith('http')) {
        imageUrl = getMediaUrl(imageUrl) || imageUrl;
      }

      // Remove placeholder and insert image
      quill.deleteText(index, 20);
      quill.insertEmbed(index, 'image', imageUrl);
      quill.setSelection(index + 1);
      
      toast.success('Image uploaded successfully');
    } catch (error: any) {
      console.error('Image upload error:', error);
      quill.deleteText(index, 20);
      toast.error('Failed to upload image. Please use an external image URL instead.');
    }
  };

  const modules = useMemo(() => ({
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike', 'blockquote'],
        [{'list': 'ordered'}, {'list': 'bullet'}],
        ['link', 'image', 'video'],
        ['clean']
      ],
      handlers: {
        image: async function() {
          const input = document.createElement('input');
          input.setAttribute('type', 'file');
          input.setAttribute('accept', 'image/*');
          input.click();

          input.onchange = async () => {
            const file = input.files?.[0];
            if (!file) return;

            const quill = quillRef.current?.getEditor();
            if (!quill) return;

            const range = quill.getSelection();
            const index = range ? range.index : 0;

            await uploadImageFile(file, index);
          };
        }
      }
    },
    clipboard: {
      // Intercept paste events to handle image uploads
      matchers: [
        ['image', async (node: any, delta: any) => {
          const quill = quillRef.current?.getEditor();
          if (!quill) return delta;

          // Check if it's a base64 image
          if (node.src && node.src.startsWith('data:image/')) {
            // Convert base64 to File
            const response = await fetch(node.src);
            const blob = await response.blob();
            const file = new File([blob], 'pasted-image.png', { type: blob.type });

            const range = quill.getSelection();
            const index = range ? range.index : quill.getLength();

            // Upload the image
            await uploadImageFile(file, index);

            // Return empty delta to prevent inserting base64
            return new (quill.constructor as any).Delta();
          }

          // For external URLs, allow them through
          return delta;
        }]
      ]
    }
  }), []);

  return (
    <div className="bg-white text-black">
      <ReactQuill 
        ref={quillRef}
        theme="snow" 
        value={value} 
        onChange={onChange} 
        modules={modules}
        className="h-64 mb-12" // Height + margin for toolbar
      />
    </div>
  );
}