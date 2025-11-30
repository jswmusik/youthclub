import { useState } from 'react';
import { NewsTag } from '../../../types/news';

interface Props {
    tags: NewsTag[];
    selectedTag: number | null;
    onSelectTag: (id: number | null) => void;
    onSearch: (query: string) => void;
}

export default function NewsSidebar({ tags, selectedTag, onSelectTag, onSearch }: Props) {
    const [searchVal, setSearchVal] = useState('');

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        onSearch(searchVal);
    };

    return (
        <div className="bg-white rounded-xl shadow-sm p-6 sticky top-24">
            <h3 className="font-bold text-gray-800 mb-4 text-lg">Discover</h3>
            
            {/* Search */}
            <form onSubmit={handleSearch} className="mb-6">
                <div className="relative">
                    <input 
                        type="text" 
                        placeholder="Search news..." 
                        className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        value={searchVal}
                        onChange={(e) => setSearchVal(e.target.value)}
                    />
                    <svg className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>
            </form>

            {/* Tags */}
            <div className="space-y-2">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Topics</h4>
                <button
                    onClick={() => onSelectTag(null)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        selectedTag === null 
                        ? 'bg-blue-50 text-blue-700' 
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                >
                    All Stories
                </button>
                {tags.map(tag => (
                    <button
                        key={tag.id}
                        onClick={() => onSelectTag(tag.id)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            selectedTag === tag.id 
                            ? 'bg-blue-50 text-blue-700' 
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                    >
                        {tag.name}
                    </button>
                ))}
            </div>
        </div>
    );
}

