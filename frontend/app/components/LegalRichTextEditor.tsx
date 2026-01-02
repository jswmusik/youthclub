'use client';

import { useRef, useMemo, useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { FileText, ChevronDown, Check } from 'lucide-react';
import api from '@/lib/api';
import 'react-quill-new/dist/quill.snow.css';

const ReactQuill = dynamic(() => import('react-quill-new'), { 
  ssr: false,
  loading: () => (
    <div className="h-48 bg-[var(--dark-700)] rounded-xl flex items-center justify-center border-2 border-[var(--dark-500)]">
      <div className="flex items-center gap-2 text-[var(--brand-light)]/40">
        <div className="w-4 h-4 border-2 border-[var(--brand-light)]/20 border-t-[var(--brand-primary)] rounded-full animate-spin" />
        <span>Laddar editor...</span>
      </div>
    </div>
  )
});

interface Boilerplate {
  id: number;
  name: string;
  usage: string;
  usage_display: string;
  content: string;
  description: string;
}

interface LegalRichTextEditorProps {
  value: string;
  onChange: (content: string) => void;
  placeholder?: string;
  minHeight?: string;
  usage: 'terms_and_conditions' | 'club_policies' | 'privacy_policy' | 'general';
  label?: string;
  insertTemplateLabel?: string;
}

export default function LegalRichTextEditor({ 
  value, 
  onChange, 
  placeholder = "Skriv innehåll här...",
  minHeight = "200px",
  usage,
  label,
  insertTemplateLabel = "Infoga mall"
}: LegalRichTextEditorProps) {
  const quillRef = useRef<any>(null);
  const [boilerplates, setBoilerplates] = useState<Boilerplate[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loadingBoilerplates, setLoadingBoilerplates] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch boilerplates for this usage
  useEffect(() => {
    const fetchBoilerplates = async () => {
      setLoadingBoilerplates(true);
      try {
        const response = await api.get(`/cms/boilerplates/for-field/${usage}/`);
        setBoilerplates(response.data || []);
      } catch (error) {
        console.error('Error fetching boilerplates:', error);
      } finally {
        setLoadingBoilerplates(false);
      }
    };
    fetchBoilerplates();
  }, [usage]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const modules = useMemo(() => ({
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['link'],
    ],
  }), []);

  const formats = [
    'header',
    'bold', 'italic', 'underline',
    'list',
    'link'
  ];

  const handleInsertTemplate = (boilerplate: Boilerplate) => {
    onChange(boilerplate.content);
    setShowDropdown(false);
  };

  return (
    <div className="legal-rich-editor space-y-2">
      {/* Header with label and insert template button */}
      <div className="flex items-center justify-between">
        {label && (
          <label className="block text-sm font-semibold text-[var(--brand-light)]/80">
            {label}
          </label>
        )}
        
        {/* Insert Template Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setShowDropdown(!showDropdown)}
            disabled={loadingBoilerplates || boilerplates.length === 0}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-[var(--brand-primary)] bg-[var(--brand-primary)]/10 hover:bg-[var(--brand-primary)]/20 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileText className="w-4 h-4" />
            {insertTemplateLabel}
            <ChevronDown className={`w-4 h-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
          </button>

          {showDropdown && boilerplates.length > 0 && (
            <div className="absolute right-0 top-full mt-1 w-64 bg-[var(--dark-700)] border border-[var(--dark-500)] rounded-xl shadow-xl z-50 overflow-hidden">
              <div className="p-2 border-b border-[var(--dark-600)]">
                <p className="text-xs text-[var(--brand-light)]/50 px-2">Välj mall att infoga</p>
              </div>
              <div className="max-h-48 overflow-y-auto">
                {boilerplates.map((bp) => (
                  <button
                    key={bp.id}
                    type="button"
                    onClick={() => handleInsertTemplate(bp)}
                    className="w-full text-left px-4 py-2.5 hover:bg-[var(--dark-600)] transition-colors"
                  >
                    <div className="font-medium text-sm text-[var(--brand-light)]">{bp.name}</div>
                    {bp.description && (
                      <div className="text-xs text-[var(--brand-light)]/50 mt-0.5 line-clamp-1">{bp.description}</div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {showDropdown && boilerplates.length === 0 && !loadingBoilerplates && (
            <div className="absolute right-0 top-full mt-1 w-64 bg-[var(--dark-700)] border border-[var(--dark-500)] rounded-xl shadow-xl z-50 p-4 text-center">
              <FileText className="w-6 h-6 mx-auto mb-2 text-[var(--brand-light)]/30" />
              <p className="text-sm text-[var(--brand-light)]/50">Inga mallar tillgängliga</p>
              <p className="text-xs text-[var(--brand-light)]/30 mt-1">Skapa mallar under Inställningar → Textmallar</p>
            </div>
          )}
        </div>
      </div>

      {/* Editor */}
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
        .legal-rich-editor .ql-container.ql-snow,
        .legal-rich-editor .ql-toolbar.ql-snow {
          border: none;
        }
        
        .legal-rich-editor > div:last-of-type {
          border-radius: 12px;
          border: 2px solid var(--dark-500);
          transition: border-color 0.2s ease;
          overflow: hidden;
        }
        
        :root:not(.dark) .legal-rich-editor > div:last-of-type {
          border: 2px solid #d1d5db;
        }
        
        .legal-rich-editor > div:last-of-type:hover {
          border-color: rgba(var(--brand-primary-rgb, 124, 58, 237), 0.3);
        }
        
        .legal-rich-editor > div:last-of-type:focus-within {
          border-color: var(--brand-primary);
        }
        
        /* Toolbar Styling */
        .legal-rich-editor .ql-toolbar.ql-snow {
          background: var(--dark-700);
          border-bottom: 1px solid var(--dark-500) !important;
          padding: 10px;
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
        }
        
        /* Light mode toolbar */
        :root:not(.dark) .legal-rich-editor .ql-toolbar.ql-snow {
          background: #f9fafb;
          border-bottom: 1px solid #e5e7eb !important;
        }
        
        .legal-rich-editor .ql-toolbar .ql-formats {
          margin-right: 8px;
          display: flex;
          align-items: center;
          gap: 2px;
        }
        
        /* Toolbar Buttons */
        .legal-rich-editor .ql-toolbar button {
          width: 30px;
          height: 30px;
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          background: var(--dark-600);
          border: none;
          transition: all 0.15s ease;
        }
        
        :root:not(.dark) .legal-rich-editor .ql-toolbar button {
          background: #e5e7eb;
        }
        
        .legal-rich-editor .ql-toolbar button:hover {
          background: rgba(var(--brand-primary-rgb, 124, 58, 237), 0.2);
        }
        
        .legal-rich-editor .ql-toolbar button.ql-active {
          background: var(--brand-primary);
        }
        
        .legal-rich-editor .ql-toolbar button.ql-active .ql-stroke {
          stroke: var(--dark-900);
        }
        
        .legal-rich-editor .ql-toolbar button.ql-active .ql-fill {
          fill: var(--dark-900);
        }
        
        /* Toolbar Icons */
        .legal-rich-editor .ql-toolbar .ql-stroke {
          stroke: var(--brand-light);
          opacity: 0.7;
        }
        
        :root:not(.dark) .legal-rich-editor .ql-toolbar .ql-stroke {
          stroke: #374151;
        }
        
        .legal-rich-editor .ql-toolbar .ql-fill {
          fill: var(--brand-light);
          opacity: 0.7;
        }
        
        :root:not(.dark) .legal-rich-editor .ql-toolbar .ql-fill {
          fill: #374151;
        }
        
        .legal-rich-editor .ql-toolbar button:hover .ql-stroke {
          stroke: var(--brand-primary);
          opacity: 1;
        }
        
        .legal-rich-editor .ql-toolbar button:hover .ql-fill {
          fill: var(--brand-primary);
          opacity: 1;
        }
        
        /* Header Dropdown */
        .legal-rich-editor .ql-toolbar .ql-picker {
          color: var(--brand-light);
        }
        
        :root:not(.dark) .legal-rich-editor .ql-toolbar .ql-picker {
          color: #374151;
        }
        
        .legal-rich-editor .ql-toolbar .ql-picker-label {
          background: var(--dark-600);
          border-radius: 6px;
          border: none;
          padding: 4px 8px;
          height: 30px;
          display: flex;
          align-items: center;
        }
        
        :root:not(.dark) .legal-rich-editor .ql-toolbar .ql-picker-label {
          background: #e5e7eb;
        }
        
        .legal-rich-editor .ql-toolbar .ql-picker-label:hover {
          background: rgba(var(--brand-primary-rgb, 124, 58, 237), 0.2);
          color: var(--brand-primary);
        }
        
        .legal-rich-editor .ql-toolbar .ql-picker-label .ql-stroke {
          stroke: var(--brand-light);
          opacity: 0.7;
        }
        
        :root:not(.dark) .legal-rich-editor .ql-toolbar .ql-picker-label .ql-stroke {
          stroke: #374151;
        }
        
        .legal-rich-editor .ql-toolbar .ql-picker-label:hover .ql-stroke {
          stroke: var(--brand-primary);
          opacity: 1;
        }
        
        .legal-rich-editor .ql-toolbar .ql-picker-options {
          background: var(--dark-700);
          border: 1px solid var(--dark-500);
          border-radius: 8px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.3);
          padding: 4px;
          margin-top: 4px;
        }
        
        :root:not(.dark) .legal-rich-editor .ql-toolbar .ql-picker-options {
          background: #ffffff;
          border: 1px solid #d1d5db;
        }
        
        .legal-rich-editor .ql-toolbar .ql-picker-item {
          color: var(--brand-light);
          padding: 6px 10px;
          border-radius: 4px;
        }
        
        :root:not(.dark) .legal-rich-editor .ql-toolbar .ql-picker-item {
          color: #1f2937;
        }
        
        .legal-rich-editor .ql-toolbar .ql-picker-item:hover {
          background: var(--dark-600);
          color: var(--brand-light);
        }
        
        :root:not(.dark) .legal-rich-editor .ql-toolbar .ql-picker-item:hover {
          background: #f3f4f6;
          color: #1f2937;
        }
        
        .legal-rich-editor .ql-toolbar .ql-picker-item.ql-selected {
          background: var(--brand-primary);
          color: var(--dark-900);
        }
        
        /* Editor Container */
        .legal-rich-editor .ql-container.ql-snow {
          background: var(--dark-700);
          font-family: inherit;
          font-size: 15px;
        }
        
        /* Light mode: use light background for editor */
        :root:not(.dark) .legal-rich-editor .ql-container.ql-snow {
          background: #ffffff;
        }
        
        .legal-rich-editor .ql-editor {
          min-height: ${minHeight};
          padding: 14px;
          color: var(--brand-light);
          line-height: 1.6;
        }
        
        /* Light mode: black text on light background */
        :root:not(.dark) .legal-rich-editor .ql-editor {
          color: #1f2937;
        }
        
        .legal-rich-editor .ql-editor.ql-blank::before {
          color: var(--brand-light);
          opacity: 0.3;
          font-style: normal;
          left: 14px;
          right: 14px;
        }
        
        :root:not(.dark) .legal-rich-editor .ql-editor.ql-blank::before {
          color: #6b7280;
          opacity: 1;
        }
        
        /* Content Styling */
        .legal-rich-editor .ql-editor h1 {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--brand-light);
          margin-top: 1.5rem;
          margin-bottom: 0.75rem;
        }
        
        .legal-rich-editor .ql-editor h1:first-child {
          margin-top: 0;
        }
        
        :root:not(.dark) .legal-rich-editor .ql-editor h1 {
          color: #111827;
        }
        
        .legal-rich-editor .ql-editor h2 {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--brand-light);
          margin-top: 1.25rem;
          margin-bottom: 0.625rem;
        }
        
        .legal-rich-editor .ql-editor h2:first-child {
          margin-top: 0;
        }
        
        :root:not(.dark) .legal-rich-editor .ql-editor h2 {
          color: #111827;
        }
        
        .legal-rich-editor .ql-editor h3 {
          font-size: 1.1rem;
          font-weight: 600;
          color: var(--brand-light);
          margin-top: 1rem;
          margin-bottom: 0.5rem;
        }
        
        .legal-rich-editor .ql-editor h3:first-child {
          margin-top: 0;
        }
        
        :root:not(.dark) .legal-rich-editor .ql-editor h3 {
          color: #111827;
        }
        
        .legal-rich-editor .ql-editor p {
          margin-bottom: 0.75rem;
        }
        
        .legal-rich-editor .ql-editor a {
          color: var(--brand-primary);
          text-decoration: underline;
        }
        
        .legal-rich-editor .ql-editor ul,
        .legal-rich-editor .ql-editor ol {
          padding-left: 1.5rem;
          margin-top: 0.5rem;
          margin-bottom: 0.75rem;
        }
        
        .legal-rich-editor .ql-editor li {
          margin-bottom: 0.375rem;
          line-height: 1.6;
        }
        
        /* Tooltip styling - Link input popup */
        .legal-rich-editor .ql-snow .ql-tooltip {
          background: var(--dark-600) !important;
          border: 2px solid var(--dark-400) !important;
          border-radius: 10px !important;
          color: var(--brand-light) !important;
          box-shadow: 0 10px 40px rgba(0,0,0,0.5) !important;
          padding: 10px 14px !important;
          z-index: 9999 !important;
          left: 50% !important;
          transform: translateX(-50%) !important;
          margin-left: 0 !important;
        }
        
        .legal-rich-editor .ql-snow .ql-tooltip[data-mode=link]::before {
          content: 'Ange URL:' !important;
          color: var(--brand-light) !important;
          opacity: 0.7;
          margin-right: 8px;
        }
        
        .legal-rich-editor .ql-snow .ql-tooltip input[type=text] {
          background: var(--dark-700) !important;
          border: 2px solid var(--dark-500) !important;
          color: var(--brand-light) !important;
          border-radius: 6px !important;
          padding: 6px 10px !important;
          outline: none !important;
          width: 200px !important;
          font-size: 14px !important;
        }
        
        .legal-rich-editor .ql-snow .ql-tooltip input[type=text]:focus {
          border-color: var(--brand-primary) !important;
        }
        
        .legal-rich-editor .ql-snow .ql-tooltip a {
          color: var(--brand-primary) !important;
          font-weight: 600;
        }
        
        .legal-rich-editor .ql-snow .ql-tooltip a.ql-action {
          background: var(--brand-primary) !important;
          color: var(--dark-900) !important;
          padding: 5px 12px !important;
          border-radius: 6px !important;
          margin-left: 8px !important;
          text-decoration: none !important;
          font-weight: 600 !important;
        }
        
        .legal-rich-editor .ql-snow .ql-tooltip a.ql-action::after {
          content: 'Spara' !important;
          margin-left: 0 !important;
          border: none !important;
        }
        
        .legal-rich-editor .ql-snow .ql-tooltip a.ql-remove {
          margin-left: 8px !important;
          color: var(--brand-red) !important;
        }
        
        .legal-rich-editor .ql-snow .ql-tooltip a.ql-remove::before {
          content: 'Ta bort' !important;
        }
        
        /* Selection styling */
        .legal-rich-editor .ql-editor ::selection {
          background: var(--brand-primary);
          color: var(--dark-900);
        }
      `}</style>
    </div>
  );
}

