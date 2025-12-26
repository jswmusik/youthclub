'use client';

import React, { useState, useEffect } from 'react';
import { UsersRound, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';
import { GroupComparisonData } from '@/lib/analytics-api';

interface Props {
  data: GroupComparisonData[];
}

export default function GroupComparisonTable({ data }: Props) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 300);
    return () => clearTimeout(timer);
  }, []);

  if (!data || data.length === 0) return null;

  // Calculate totals
  const totals = data.reduce(
    (acc, group) => ({
      members: acc.members + group.total_members,
      checkins: acc.checkins + group.total_checkins,
      newMembers: acc.newMembers + group.new_members,
      male: acc.male + group.male_count,
      female: acc.female + group.female_count,
      other: acc.other + group.other_count,
    }),
    { members: 0, checkins: 0, newMembers: 0, male: 0, female: 0, other: 0 }
  );

  return (
    <div className={`bg-[var(--dark-800)] rounded-none sm:rounded-xl border-y sm:border border-[var(--dark-600)] overflow-hidden transition-all duration-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      {/* Header */}
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 sm:p-6 flex items-center justify-between hover:bg-[var(--dark-700)]/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-blue)] to-[#38BDF8] flex items-center justify-center shadow-lg shadow-[var(--brand-blue)]/20">
            <UsersRound className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-[var(--brand-light)]">Group Comparison</h3>
            <p className="text-xs text-[var(--brand-light)]/50">{data.length} groups • {totals.members} total members</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2">
            <span className="px-2 py-1 bg-[var(--brand-green)]/20 text-[var(--brand-green)] rounded-full text-xs font-medium border border-[var(--brand-green)]/30">
              +{totals.newMembers} new
            </span>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-[var(--brand-light)]/50" />
          ) : (
            <ChevronDown className="w-5 h-5 text-[var(--brand-light)]/50" />
          )}
        </div>
      </button>
      
      {/* Table Content */}
      <div className={`overflow-hidden transition-all duration-300 ${isExpanded ? 'max-h-[800px]' : 'max-h-0'}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[var(--dark-700)] text-[var(--brand-light)]/60 font-medium border-t border-[var(--dark-600)]">
              <tr>
                <th className="px-4 sm:px-6 py-3 text-left">Group Name</th>
                <th className="px-4 py-3 text-right">Members</th>
                <th className="px-4 py-3 text-right">Check-ins</th>
                <th className="px-4 py-3 text-center hidden sm:table-cell" colSpan={1}>
                  Gender Balance
                </th>
                <th className="px-4 py-3 text-right">New</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--dark-600)]">
              {data.map((group, index) => {
                const total = group.male_count + group.female_count + group.other_count;
                const malePercent = total > 0 ? Math.round((group.male_count / total) * 100) : 0;
                const femalePercent = total > 0 ? Math.round((group.female_count / total) * 100) : 0;
                const otherPercent = total > 0 ? 100 - malePercent - femalePercent : 0;
                const isHovered = hoveredRow === index;

                return (
                  <tr 
                    key={group.group_id} 
                    className={`transition-colors ${isHovered ? 'bg-[var(--dark-700)]/50' : ''}`}
                    onMouseEnter={() => setHoveredRow(index)}
                    onMouseLeave={() => setHoveredRow(null)}
                    style={{
                      animationDelay: `${index * 30}ms`,
                      animation: isVisible ? 'fadeIn 0.3s ease-out forwards' : 'none'
                    }}
                  >
                    <td className="px-4 sm:px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-bold ${
                          index === 0 ? 'bg-[#FBBF24]/20 text-[#FBBF24] border border-[#FBBF24]/30' : 
                          index === 1 ? 'bg-[var(--brand-light)]/10 text-[var(--brand-light)]/70 border border-[var(--brand-light)]/20' : 
                          index === 2 ? 'bg-[#FB923C]/20 text-[#FB923C] border border-[#FB923C]/30' : 
                          'bg-[var(--dark-600)] text-[var(--brand-light)]/40 border border-[var(--dark-500)]'
                        }`}>
                          {index + 1}
                        </span>
                        <div>
                          <div className={`font-medium transition-colors ${isHovered ? 'text-[var(--brand-primary)]' : 'text-[var(--brand-light)]'}`}>
                            {group.group_name}
                          </div>
                          {group.is_municipality_wide ? (
                            <span className="text-xs text-[var(--brand-purple)]">Municipality-wide</span>
                          ) : group.club_name ? (
                            <span className="text-xs text-[var(--brand-light)]/40">{group.club_name}</span>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right font-semibold text-[var(--brand-light)]">
                      {group.total_members}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <span className="font-medium text-[var(--brand-light)]">{group.total_checkins}</span>
                        {group.total_members > 0 && (
                          <span className="text-xs text-[var(--brand-light)]/40">
                            ({(group.total_checkins / group.total_members).toFixed(1)}/m)
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 hidden sm:table-cell">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-3 bg-[var(--dark-600)] rounded-full overflow-hidden flex">
                          {malePercent > 0 && (
                            <div 
                              className="bg-[var(--brand-blue)] h-full transition-all" 
                              style={{ width: `${malePercent}%` }}
                              title={`Male: ${group.male_count} (${malePercent}%)`}
                            />
                          )}
                          {femalePercent > 0 && (
                            <div 
                              className="bg-[#EC4899] h-full transition-all" 
                              style={{ width: `${femalePercent}%` }}
                              title={`Female: ${group.female_count} (${femalePercent}%)`}
                            />
                          )}
                          {otherPercent > 0 && (
                            <div 
                              className="bg-[var(--brand-green)] h-full transition-all" 
                              style={{ width: `${otherPercent}%` }}
                              title={`Other: ${group.other_count} (${otherPercent}%)`}
                            />
                          )}
                        </div>
                        <div className="text-xs text-[var(--brand-light)]/40 w-20 text-right">
                          {group.male_count}/{group.female_count}/{group.other_count}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      {group.new_members > 0 ? (
                        <span className="inline-flex items-center gap-1 text-[var(--brand-green)] font-medium">
                          <TrendingUp className="w-3 h-3" />
                          +{group.new_members}
                        </span>
                      ) : (
                        <span className="text-[var(--brand-light)]/30">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            
            {/* Summary Footer */}
            <tfoot className="bg-[var(--dark-700)] border-t-2 border-[var(--dark-500)]">
              <tr className="font-medium text-[var(--brand-light)]">
                <td className="px-4 sm:px-6 py-4">
                  <span className="text-[var(--brand-light)]/50">Total ({data.length} groups)</span>
                </td>
                <td className="px-4 py-4 text-right font-bold">{totals.members}</td>
                <td className="px-4 py-4 text-right font-bold">{totals.checkins}</td>
                <td className="px-4 py-4 text-center hidden sm:table-cell">
                  <span className="text-xs text-[var(--brand-light)]/50">
                    {totals.male} / {totals.female} / {totals.other}
                  </span>
                </td>
                <td className="px-4 py-4 text-right font-bold text-[var(--brand-green)]">
                  +{totals.newMembers}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Legend */}
        <div className="px-4 sm:px-6 py-3 border-t border-[var(--dark-600)] bg-[var(--dark-700)]/50 hidden sm:flex items-center gap-4 text-xs text-[var(--brand-light)]/50">
          <span className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-[var(--brand-blue)] rounded" /> Male
          </span>
          <span className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-[#EC4899] rounded" /> Female
          </span>
          <span className="flex items-center gap-1.5">
            <div className="w-3 h-3 bg-[var(--brand-green)] rounded" /> Other
          </span>
          <span className="ml-auto text-[var(--brand-light)]/30">Sorted by total members</span>
        </div>
      </div>
      
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

