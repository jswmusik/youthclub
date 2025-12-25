'use client';

import { useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';
import 'react-quill-new/dist/quill.snow.css';
import { learningApi } from '@/lib/learning-api';
import { getMediaUrl } from '@/app/utils';
import toast from 'react-hot-toast';

// Dynamically import ReactQuill with SSR disabled
const ReactQuill = dynamic(() => import('react-quill-new'), { 
  ssr: false,
  loading: () => (
    <div className="h-64 bg-[var(--dark-700)] rounded-xl flex items-center justify-center border-2 border-[var(--dark-500)]">
      <div className="flex items-center gap-2 text-[var(--brand-light)]/40">
        <div className="w-4 h-4 border-2 border-[var(--brand-light)]/20 border-t-[var(--brand-primary)] rounded-full animate-spin" />
        <span>Loading editor...</span>
      </div>
    </div>
  )
});

interface EditorProps {
  value?: string;
  content?: string;
  onChange: (content: string) => void;
  placeholder?: string;
  minHeight?: string;
}

export default function RichTextEditor({ 
  value, 
  content,
  onChange,
  placeholder = "Write your content...",
  minHeight = "300px"
}: EditorProps) {
  const quillRef = useRef<any>(null);
  
  // Support both 'value' and 'content' props for backwards compatibility
  const editorValue = value ?? content ?? '';

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
        imageUrl = getMediaUrl(response.url) || response.url;
      } else if (response.image) {
        imageUrl = getMediaUrl(response.image) || response.image;
      } else if (typeof response === 'string') {
        imageUrl = getMediaUrl(response) || response;
      }

      if (!imageUrl) {
        throw new Error('No image URL returned from server');
      }
      
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
      matchers: [
        ['image', async (node: any, delta: any) => {
          const quill = quillRef.current?.getEditor();
          if (!quill) return delta;

          if (node.src && node.src.startsWith('data:image/')) {
            const response = await fetch(node.src);
            const blob = await response.blob();
            const file = new File([blob], 'pasted-image.png', { type: blob.type });

            const range = quill.getSelection();
            const index = range ? range.index : quill.getLength();

            await uploadImageFile(file, index);

            return new (quill.constructor as any).Delta();
          }

          return delta;
        }]
      ]
    }
  }), []);

  return (
    <div className="cms-rich-editor">
      <ReactQuill 
        ref={quillRef}
        theme="snow" 
        value={editorValue} 
        onChange={onChange} 
        modules={modules}
        placeholder={placeholder}
      />

      <style jsx global>{`
        /* CMS Editor Container */
        .cms-rich-editor {
          border-radius: 12px;
          border: 2px solid var(--dark-500);
          transition: border-color 0.2s ease;
          position: relative;
          overflow: hidden;
        }
        
        .cms-rich-editor:hover {
          border-color: rgba(var(--brand-primary-rgb, 124, 58, 237), 0.3);
        }
        
        .cms-rich-editor:focus-within {
          border-color: var(--brand-primary);
        }
        
        /* Toolbar Styling */
        .cms-rich-editor .ql-toolbar.ql-snow {
          background: var(--dark-700);
          border: none;
          border-bottom: 1px solid var(--dark-500);
          border-radius: 10px 10px 0 0;
          padding: 10px 12px;
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
        }
        
        .cms-rich-editor .ql-toolbar .ql-formats {
          margin-right: 8px;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        
        /* Toolbar Buttons */
        .cms-rich-editor .ql-toolbar button {
          width: 32px;
          height: 32px;
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          background: var(--dark-600);
          border: none;
          transition: all 0.15s ease;
        }
        
        .cms-rich-editor .ql-toolbar button:hover {
          background: rgba(var(--brand-primary-rgb, 124, 58, 237), 0.2);
        }
        
        .cms-rich-editor .ql-toolbar button.ql-active {
          background: var(--brand-primary);
        }
        
        .cms-rich-editor .ql-toolbar button.ql-active .ql-stroke {
          stroke: var(--dark-900);
        }
        
        .cms-rich-editor .ql-toolbar button.ql-active .ql-fill {
          fill: var(--dark-900);
        }
        
        /* Toolbar Dropdowns (Header selector) */
        .cms-rich-editor .ql-toolbar .ql-picker {
          color: var(--brand-light);
        }
        
        .cms-rich-editor .ql-toolbar .ql-picker-label {
          background: var(--dark-600);
          border-radius: 8px;
          border: none !important;
          padding: 4px 8px;
          color: var(--brand-light);
          opacity: 0.7;
        }
        
        .cms-rich-editor .ql-toolbar .ql-picker-label:hover {
          background: rgba(var(--brand-primary-rgb, 124, 58, 237), 0.2);
          color: var(--brand-primary);
          opacity: 1;
        }
        
        .cms-rich-editor .ql-toolbar .ql-picker-label .ql-stroke {
          stroke: var(--brand-light);
          opacity: 0.7;
        }
        
        .cms-rich-editor .ql-toolbar .ql-picker-label:hover .ql-stroke {
          stroke: var(--brand-primary);
          opacity: 1;
        }
        
        .cms-rich-editor .ql-toolbar .ql-picker-options {
          background: var(--dark-600) !important;
          border: 2px solid var(--dark-400) !important;
          border-radius: 12px !important;
          box-shadow: 0 10px 40px rgba(0,0,0,0.5) !important;
          padding: 8px !important;
        }
        
        .cms-rich-editor .ql-toolbar .ql-picker-item {
          color: var(--brand-light) !important;
          padding: 8px 12px !important;
          border-radius: 8px !important;
        }
        
        .cms-rich-editor .ql-toolbar .ql-picker-item:hover {
          background: rgba(var(--brand-primary-rgb, 124, 58, 237), 0.2) !important;
          color: var(--brand-primary) !important;
        }
        
        .cms-rich-editor .ql-toolbar .ql-picker-item.ql-selected {
          color: var(--brand-primary) !important;
        }
        
        /* Toolbar Icons */
        .cms-rich-editor .ql-toolbar .ql-stroke {
          stroke: var(--brand-light);
          opacity: 0.7;
        }
        
        .cms-rich-editor .ql-toolbar .ql-fill {
          fill: var(--brand-light);
          opacity: 0.7;
        }
        
        .cms-rich-editor .ql-toolbar button:hover .ql-stroke {
          stroke: var(--brand-primary);
          opacity: 1;
        }
        
        .cms-rich-editor .ql-toolbar button:hover .ql-fill {
          fill: var(--brand-primary);
          opacity: 1;
        }
        
        /* Editor Container */
        .cms-rich-editor .ql-container.ql-snow {
          background: var(--dark-700);
          border: none;
          border-radius: 0 0 10px 10px;
          font-family: inherit;
          font-size: 15px;
          overflow: visible;
        }
        
        .cms-rich-editor .ql-editor {
          min-height: ${minHeight};
          padding: 16px;
          padding-bottom: 40px;
          color: var(--brand-light);
          line-height: 1.6;
          overflow: visible;
        }
        
        .cms-rich-editor .ql-editor.ql-blank::before {
          color: var(--brand-light);
          opacity: 0.3;
          font-style: normal;
          left: 16px;
          right: 16px;
        }
        
        /* Content Styling */
        .cms-rich-editor .ql-editor p {
          margin-bottom: 0.75rem;
        }
        
        .cms-rich-editor .ql-editor h1 {
          font-size: 2rem;
          font-weight: 700;
          margin-bottom: 1rem;
          color: var(--brand-light);
        }
        
        .cms-rich-editor .ql-editor h2 {
          font-size: 1.5rem;
          font-weight: 600;
          margin-bottom: 0.75rem;
          color: var(--brand-light);
        }
        
        .cms-rich-editor .ql-editor h3 {
          font-size: 1.25rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
          color: var(--brand-light);
        }
        
        .cms-rich-editor .ql-editor a {
          color: var(--brand-primary);
          text-decoration: underline;
        }
        
        .cms-rich-editor .ql-editor a:hover {
          color: var(--brand-purple);
        }
        
        .cms-rich-editor .ql-editor strong {
          font-weight: 600;
        }
        
        .cms-rich-editor .ql-editor blockquote {
          border-left: 4px solid var(--brand-primary);
          padding-left: 16px;
          margin: 1rem 0;
          color: var(--brand-light);
          opacity: 0.8;
          font-style: italic;
        }
        
        .cms-rich-editor .ql-editor ul,
        .cms-rich-editor .ql-editor ol {
          padding-left: 1.5rem;
          margin-bottom: 0.75rem;
        }
        
        .cms-rich-editor .ql-editor li {
          margin-bottom: 0.25rem;
        }
        
        .cms-rich-editor .ql-editor img {
          max-width: 100%;
          border-radius: 8px;
          margin: 1rem 0;
        }
        
        .cms-rich-editor .ql-editor .ql-video {
          width: 100%;
          aspect-ratio: 16/9;
          border-radius: 8px;
          margin: 1rem 0;
        }
        
        /* Tooltip styling - Link/Video input popup */
        .cms-rich-editor .ql-snow .ql-tooltip {
          background: var(--dark-600) !important;
          border: 2px solid var(--dark-400) !important;
          border-radius: 12px !important;
          color: var(--brand-light) !important;
          box-shadow: 0 10px 40px rgba(0,0,0,0.5) !important;
          padding: 12px 16px !important;
          z-index: 9999 !important;
          left: 50% !important;
          transform: translateX(-50%) !important;
          margin-left: 0 !important;
          white-space: nowrap;
        }
        
        .cms-rich-editor .ql-snow .ql-tooltip[data-mode=link]::before {
          content: 'Enter URL:' !important;
          color: var(--brand-light) !important;
          opacity: 0.7;
          margin-right: 8px;
        }
        
        .cms-rich-editor .ql-snow .ql-tooltip[data-mode=video]::before {
          content: 'Enter Video URL:' !important;
          color: var(--brand-light) !important;
          opacity: 0.7;
          margin-right: 8px;
        }
        
        .cms-rich-editor .ql-snow .ql-tooltip input[type=text] {
          background: var(--dark-700) !important;
          border: 2px solid var(--dark-500) !important;
          color: var(--brand-light) !important;
          border-radius: 8px !important;
          padding: 8px 12px !important;
          outline: none !important;
          width: 250px !important;
          font-size: 14px !important;
        }
        
        .cms-rich-editor .ql-snow .ql-tooltip input[type=text]:focus {
          border-color: var(--brand-primary) !important;
        }
        
        .cms-rich-editor .ql-snow .ql-tooltip input[type=text]::placeholder {
          color: var(--brand-light);
          opacity: 0.4;
        }
        
        .cms-rich-editor .ql-snow .ql-tooltip a {
          color: var(--brand-primary) !important;
          font-weight: 600;
        }
        
        .cms-rich-editor .ql-snow .ql-tooltip a.ql-action {
          background: var(--brand-primary) !important;
          color: var(--dark-900) !important;
          padding: 6px 14px !important;
          border-radius: 8px !important;
          margin-left: 10px !important;
          text-decoration: none !important;
          font-weight: 600 !important;
        }
        
        .cms-rich-editor .ql-snow .ql-tooltip a.ql-action::after {
          content: 'Save' !important;
          margin-left: 0 !important;
          border: none !important;
        }
        
        .cms-rich-editor .ql-snow .ql-tooltip a.ql-action:hover {
          background: var(--brand-purple) !important;
        }
        
        .cms-rich-editor .ql-snow .ql-tooltip a.ql-remove {
          margin-left: 8px !important;
          color: var(--brand-red) !important;
        }
        
        .cms-rich-editor .ql-snow .ql-tooltip a.ql-remove::before {
          content: 'Remove' !important;
          margin-left: 0 !important;
        }
        
        .cms-rich-editor .ql-snow .ql-tooltip::before {
          color: var(--brand-light) !important;
          opacity: 0.7;
        }
        
        .cms-rich-editor .ql-snow .ql-tooltip .ql-preview {
          color: var(--brand-primary) !important;
        }
        
        .cms-rich-editor .ql-snow .ql-tooltip.ql-editing a.ql-action::after {
          content: 'Save' !important;
        }
        
        /* Selection styling */
        .cms-rich-editor .ql-editor ::selection {
          background: var(--brand-primary);
          color: var(--dark-900);
        }
        
        /* Scrollbar styling */
        .cms-rich-editor .ql-editor::-webkit-scrollbar {
          width: 8px;
        }
        
        .cms-rich-editor .ql-editor::-webkit-scrollbar-track {
          background: var(--dark-600);
          border-radius: 4px;
        }
        
        .cms-rich-editor .ql-editor::-webkit-scrollbar-thumb {
          background: var(--dark-400);
          border-radius: 4px;
        }
        
        .cms-rich-editor .ql-editor::-webkit-scrollbar-thumb:hover {
          background: var(--dark-300);
        }
        
        /* Mobile responsive */
        @media (max-width: 640px) {
          .cms-rich-editor .ql-toolbar.ql-snow {
            padding: 8px;
          }
          
          .cms-rich-editor .ql-toolbar button {
            width: 36px;
            height: 36px;
          }
          
          .cms-rich-editor .ql-editor {
            padding: 12px;
            font-size: 14px;
          }
          
          .cms-rich-editor .ql-snow .ql-tooltip {
            padding: 10px 12px !important;
          }
          
          .cms-rich-editor .ql-snow .ql-tooltip input[type=text] {
            width: 180px !important;
          }
        }
      `}</style>
    </div>
  );
}
