'use client';

import { useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';
import 'react-quill-new/dist/quill.snow.css';

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

interface DarkRichTextEditorProps {
  value: string;
  onChange: (content: string) => void;
  placeholder?: string;
  minHeight?: string;
}

export default function DarkRichTextEditor({ 
  value, 
  onChange, 
  placeholder = "Start writing your content...",
  minHeight = "200px"
}: DarkRichTextEditorProps) {
  const quillRef = useRef<any>(null);

  const modules = useMemo(() => ({
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      ['blockquote'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['link', 'image']
    ],
  }), []);

  const formats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'blockquote',
    'list',
    'link', 'image'
  ];

  return (
    <div className="dark-rich-editor">
      <ReactQuill 
        ref={quillRef}
        theme="snow" 
        value={value} 
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
      />

      <style jsx global>{`
        /* Dark Editor Container */
        .dark-rich-editor {
          border-radius: 12px;
          border: 2px solid var(--dark-500);
          transition: border-color 0.2s ease;
          position: relative;
        }
        
        .dark-rich-editor:hover {
          border-color: rgba(var(--brand-primary-rgb, 124, 58, 237), 0.3);
        }
        
        .dark-rich-editor:focus-within {
          border-color: var(--brand-primary);
        }
        
        /* Toolbar Styling */
        .dark-rich-editor .ql-toolbar.ql-snow {
          background: var(--dark-700);
          border: none;
          border-bottom: 1px solid var(--dark-500);
          border-radius: 10px 10px 0 0;
          padding: 12px;
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
        }
        
        .dark-rich-editor .ql-toolbar .ql-formats {
          margin-right: 8px;
          display: flex;
          align-items: center;
          gap: 2px;
        }
        
        /* Toolbar Buttons */
        .dark-rich-editor .ql-toolbar button {
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
        
        .dark-rich-editor .ql-toolbar button:hover {
          background: rgba(var(--brand-primary-rgb, 124, 58, 237), 0.2);
        }
        
        .dark-rich-editor .ql-toolbar button.ql-active {
          background: var(--brand-primary);
        }
        
        .dark-rich-editor .ql-toolbar button.ql-active .ql-stroke {
          stroke: var(--dark-900);
        }
        
        .dark-rich-editor .ql-toolbar button.ql-active .ql-fill {
          fill: var(--dark-900);
        }
        
        /* Toolbar Icons */
        .dark-rich-editor .ql-toolbar .ql-stroke {
          stroke: var(--brand-light);
          opacity: 0.7;
        }
        
        .dark-rich-editor .ql-toolbar .ql-fill {
          fill: var(--brand-light);
          opacity: 0.7;
        }
        
        .dark-rich-editor .ql-toolbar button:hover .ql-stroke {
          stroke: var(--brand-primary);
          opacity: 1;
        }
        
        .dark-rich-editor .ql-toolbar button:hover .ql-fill {
          fill: var(--brand-primary);
          opacity: 1;
        }
        
        /* Blockquote button special styling */
        .dark-rich-editor .ql-toolbar button.ql-blockquote:hover {
          background: rgba(var(--brand-peach-rgb, 255, 183, 143), 0.2);
        }
        
        .dark-rich-editor .ql-toolbar button.ql-blockquote:hover .ql-stroke,
        .dark-rich-editor .ql-toolbar button.ql-blockquote:hover .ql-fill {
          stroke: var(--brand-peach);
          fill: var(--brand-peach);
        }
        
        .dark-rich-editor .ql-toolbar button.ql-blockquote.ql-active {
          background: var(--brand-peach);
        }
        
        /* Header Dropdown */
        .dark-rich-editor .ql-toolbar .ql-picker {
          color: var(--brand-light);
        }
        
        .dark-rich-editor .ql-toolbar .ql-picker-label {
          background: var(--dark-600);
          border-radius: 8px;
          border: none;
          padding: 4px 8px;
          height: 32px;
          display: flex;
          align-items: center;
        }
        
        .dark-rich-editor .ql-toolbar .ql-picker-label:hover {
          background: rgba(var(--brand-primary-rgb, 124, 58, 237), 0.2);
          color: var(--brand-primary);
        }
        
        .dark-rich-editor .ql-toolbar .ql-picker-label .ql-stroke {
          stroke: var(--brand-light);
          opacity: 0.7;
        }
        
        .dark-rich-editor .ql-toolbar .ql-picker-label:hover .ql-stroke {
          stroke: var(--brand-primary);
          opacity: 1;
        }
        
        .dark-rich-editor .ql-toolbar .ql-picker-options {
          background: var(--dark-700);
          border: 1px solid var(--dark-500);
          border-radius: 8px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.3);
          padding: 4px;
          margin-top: 4px;
        }
        
        .dark-rich-editor .ql-toolbar .ql-picker-item {
          color: var(--brand-light);
          padding: 8px 12px;
          border-radius: 6px;
        }
        
        .dark-rich-editor .ql-toolbar .ql-picker-item:hover {
          background: var(--dark-600);
          color: var(--brand-light);
        }
        
        .dark-rich-editor .ql-toolbar .ql-picker-item.ql-selected {
          background: var(--brand-primary);
          color: var(--dark-900);
        }
        
        /* Editor Container */
        .dark-rich-editor .ql-container.ql-snow {
          background: var(--dark-700);
          border: none;
          border-radius: 0 0 10px 10px;
          font-family: inherit;
          font-size: 15px;
          overflow: visible;
        }
        
        .dark-rich-editor .ql-editor {
          min-height: ${minHeight};
          padding: 16px;
          padding-bottom: 50px;
          color: var(--brand-light);
          line-height: 1.7;
          overflow: visible;
        }
        
        .dark-rich-editor .ql-editor.ql-blank::before {
          color: var(--brand-light);
          opacity: 0.3;
          font-style: normal;
          left: 16px;
          right: 16px;
        }
        
        /* Content Styling */
        .dark-rich-editor .ql-editor h1 {
          font-size: 1.75rem;
          font-weight: 700;
          color: var(--brand-light);
          margin-bottom: 0.75rem;
        }
        
        .dark-rich-editor .ql-editor h2 {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--brand-light);
          margin-bottom: 0.5rem;
        }
        
        .dark-rich-editor .ql-editor h3 {
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--brand-light);
          margin-bottom: 0.5rem;
        }
        
        .dark-rich-editor .ql-editor p {
          margin-bottom: 0.75rem;
        }
        
        .dark-rich-editor .ql-editor a {
          color: var(--brand-primary);
          text-decoration: underline;
        }
        
        .dark-rich-editor .ql-editor a:hover {
          color: var(--brand-purple);
        }
        
        .dark-rich-editor .ql-editor ul,
        .dark-rich-editor .ql-editor ol {
          padding-left: 1.5rem;
          margin-bottom: 0.75rem;
        }
        
        .dark-rich-editor .ql-editor li {
          margin-bottom: 0.25rem;
        }
        
        .dark-rich-editor .ql-editor img {
          max-width: 100%;
          border-radius: 8px;
          margin: 1rem 0;
        }
        
        .dark-rich-editor .ql-editor blockquote {
          border-left: 3px solid var(--brand-primary);
          padding-left: 1rem;
          margin: 1rem 0;
          color: var(--brand-light);
          opacity: 0.8;
        }
        
        .dark-rich-editor .ql-editor strong {
          font-weight: 600;
        }
        
        /* Tooltip styling - Link/Image input popup */
        .dark-rich-editor .ql-snow .ql-tooltip {
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
        
        .dark-rich-editor .ql-snow .ql-tooltip[data-mode=link]::before {
          content: 'Enter URL:' !important;
          color: var(--brand-light) !important;
          opacity: 0.7;
          margin-right: 8px;
        }
        
        .dark-rich-editor .ql-snow .ql-tooltip input[type=text] {
          background: var(--dark-700) !important;
          border: 2px solid var(--dark-500) !important;
          color: var(--brand-light) !important;
          border-radius: 8px !important;
          padding: 8px 12px !important;
          outline: none !important;
          width: 220px !important;
          font-size: 14px !important;
        }
        
        .dark-rich-editor .ql-snow .ql-tooltip input[type=text]:focus {
          border-color: var(--brand-primary) !important;
        }
        
        .dark-rich-editor .ql-snow .ql-tooltip input[type=text]::placeholder {
          color: var(--brand-light);
          opacity: 0.4;
        }
        
        .dark-rich-editor .ql-snow .ql-tooltip a {
          color: var(--brand-primary) !important;
          font-weight: 600;
        }
        
        .dark-rich-editor .ql-snow .ql-tooltip a.ql-action {
          background: var(--brand-primary) !important;
          color: var(--dark-900) !important;
          padding: 6px 14px !important;
          border-radius: 8px !important;
          margin-left: 10px !important;
          text-decoration: none !important;
          font-weight: 600 !important;
        }
        
        .dark-rich-editor .ql-snow .ql-tooltip a.ql-action::after {
          content: 'Save' !important;
          margin-left: 0 !important;
          border: none !important;
        }
        
        .dark-rich-editor .ql-snow .ql-tooltip a.ql-action:hover {
          background: var(--brand-purple) !important;
        }
        
        .dark-rich-editor .ql-snow .ql-tooltip a.ql-remove {
          margin-left: 8px !important;
          color: var(--brand-red) !important;
        }
        
        .dark-rich-editor .ql-snow .ql-tooltip a.ql-remove::before {
          content: 'Remove' !important;
          margin-left: 0 !important;
        }
        
        .dark-rich-editor .ql-snow .ql-tooltip::before {
          color: var(--brand-light) !important;
          opacity: 0.7;
        }
        
        /* Tooltip arrow - hide default */
        .dark-rich-editor .ql-snow .ql-tooltip .ql-preview {
          color: var(--brand-primary) !important;
        }
        
        /* Edit link tooltip */
        .dark-rich-editor .ql-snow .ql-tooltip.ql-editing a.ql-action::after {
          content: 'Save' !important;
        }
        
        /* Selection styling */
        .dark-rich-editor .ql-editor ::selection {
          background: var(--brand-primary);
          color: var(--dark-900);
        }
        
        /* Scrollbar styling */
        .dark-rich-editor .ql-editor::-webkit-scrollbar {
          width: 8px;
        }
        
        .dark-rich-editor .ql-editor::-webkit-scrollbar-track {
          background: var(--dark-600);
          border-radius: 4px;
        }
        
        .dark-rich-editor .ql-editor::-webkit-scrollbar-thumb {
          background: var(--dark-400);
          border-radius: 4px;
        }
        
        .dark-rich-editor .ql-editor::-webkit-scrollbar-thumb:hover {
          background: var(--dark-300);
        }
        
        /* Mobile responsive */
        @media (max-width: 640px) {
          .dark-rich-editor .ql-toolbar.ql-snow {
            padding: 8px;
          }
          
          .dark-rich-editor .ql-toolbar button {
            width: 28px;
            height: 28px;
          }
          
          .dark-rich-editor .ql-toolbar .ql-picker-label {
            height: 28px;
            padding: 2px 6px;
            font-size: 13px;
          }
          
          .dark-rich-editor .ql-editor {
            padding: 12px;
            font-size: 14px;
          }
        }
      `}</style>
    </div>
  );
}
