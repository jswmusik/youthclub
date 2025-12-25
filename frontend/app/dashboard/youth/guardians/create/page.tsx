'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

import NavBar from '@/app/components/NavBar';
import YouthSidebar from '@/app/components/youth/YouthSidebar';
import { inviteGuardian } from '@/lib/api';
import Toast from '@/app/components/Toast';
import SuccessModal from '@/app/components/SuccessModal';
import { ArrowLeft, Mail, User, Phone, Users, Shield, CheckCircle, X } from 'lucide-react';


export default function AddGuardianPage() {
    const router = useRouter();
    const pathname = usePathname();
    const [loading, setLoading] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [toast, setToast] = useState({ message: '', type: 'success' as const, isVisible: false });
    const [successModal, setSuccessModal] = useState({ isVisible: false, message: '', title: '' });

    const [formData, setFormData] = useState({
        email: '',
        first_name: '',
        last_name: '',
        relationship_type: 'MOTHER' as 'MOTHER' | 'FATHER' | 'GUARDIAN' | 'OTHER',
        is_primary_guardian: false,
        phone_number: '',
        legal_gender: 'MALE' as 'MALE' | 'FEMALE' | 'OTHER'
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Prepare data - only include phone_number and legal_gender if they have values
            const submitData: any = {
                email: formData.email,
                first_name: formData.first_name,
                last_name: formData.last_name,
                relationship_type: formData.relationship_type,
                is_primary_guardian: formData.is_primary_guardian,
            };
            
            // Add optional fields only if they have values
            if (formData.phone_number.trim()) {
                submitData.phone_number = formData.phone_number.trim();
            }
            if (formData.legal_gender) {
                submitData.legal_gender = formData.legal_gender;
            }
            
            const response = await inviteGuardian(submitData);
            const data = response.data;
            
            // Determine success message based on whether existing guardian was found
            let successMessage = '';
            let successTitle = 'Guardian Added!';
            
            if (data.guardian_existed) {
                if (data.guardian_is_active) {
                    successTitle = 'Guardian Linked!';
                    successMessage = `Successfully linked to existing guardian account! ${data.guardian_first_name} ${data.guardian_last_name} has been added to your guardians list.`;
                } else {
                    successTitle = 'Guardian Found!';
                    successMessage = `We found an existing guardian account for ${data.guardian_email}. An invitation has been sent to them to accept your request.`;
                }
            } else {
                successTitle = 'Invitation Sent!';
                successMessage = `An invitation has been sent to ${formData.email}. A new guardian account will be created when they accept the invitation.`;
            }
            
            // Show success modal
            setSuccessModal({
                isVisible: true,
                message: successMessage,
                title: successTitle,
            });
            setLoading(false);
        } catch (err: any) {
            console.error(err);
            const errorMsg = err.response?.data?.detail || err.response?.data?.error || 'Failed to invite guardian.';
            setToast({ message: errorMsg, type: 'error', isVisible: true });
            setLoading(false);
        }
    };

    const handleSuccessModalClose = () => {
        setSuccessModal({ isVisible: false, message: '', title: '' });
        router.push('/dashboard/youth/profile?tab=guardians');
    };

    return (
        <div className="min-h-screen bg-[var(--dark-900)] pb-20">
            <NavBar showBackButton={true} darkMode={true} onMenuToggle={() => setIsSidebarOpen(true)} />
            
            {/* Mobile Sidebar Overlay */}
            <div 
                className={`fixed inset-0 bg-black/70 z-40 md:hidden transition-opacity duration-300 ${
                    isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
                onClick={() => setIsSidebarOpen(false)}
            />
            
            {/* Mobile Sidebar */}
            <aside 
                className={`fixed top-0 left-0 h-screen w-64 z-50 bg-[var(--dark-800)] transform transition-transform duration-300 md:hidden ${
                    isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
            >
                <div className="flex items-center justify-between h-14 sm:h-16 px-4 border-b border-[var(--dark-500)]">
                    <h1 className="text-xl font-bold text-[var(--brand-primary)]">Menu</h1>
                    <button
                        onClick={() => setIsSidebarOpen(false)}
                        className="w-9 h-9 flex items-center justify-center rounded-xl text-[var(--brand-light)] hover:bg-[var(--dark-600)]"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-4 overflow-y-auto h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-4rem)]">
                    <YouthSidebar activePath={pathname} darkMode />
                </div>
            </aside>

            <div className="max-w-3xl mx-auto px-0 sm:px-6 lg:px-8 pt-16 sm:pt-20">
                
                {/* Header */}
                <div className="mb-6 sm:mb-8 text-center px-4 sm:px-0 pt-4 sm:pt-6">
                    <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-[var(--brand-secondary)] to-[var(--brand-primary)] rounded-xl sm:rounded-2xl mb-4">
                        <Users className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
                    </div>
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[var(--brand-light)] mb-2 sm:mb-3 font-heading">Add Guardian</h1>
                    <p className="text-[var(--brand-light)]/60 text-sm sm:text-base max-w-xl mx-auto">
                        Enter their details below. If they already have an account, we will link them. 
                        Otherwise, we will send them an invite.
                    </p>
                </div>

                {/* Form */}
                <div className="bg-[var(--dark-800)] rounded-none sm:rounded-2xl border-y sm:border border-[var(--dark-500)] p-5 sm:p-6 md:p-10">
                    <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
                        
                        {/* Email */}
                        <div>
                            <label className="block text-sm font-bold text-[var(--brand-light)] mb-2 flex items-center gap-2">
                                <Mail className="w-4 h-4 text-[var(--brand-primary)]" />
                                Email Address
                            </label>
                            <input 
                                type="email" 
                                required
                                value={formData.email}
                                onChange={e => setFormData({...formData, email: e.target.value})}
                                className="w-full px-4 py-3 rounded-xl border border-[var(--dark-400)] bg-[var(--dark-700)] text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-[var(--brand-primary)] transition-all"
                                placeholder="guardian@example.com"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
                            {/* First Name */}
                            <div>
                                <label className="block text-sm font-bold text-[var(--brand-light)] mb-2 flex items-center gap-2">
                                    <User className="w-4 h-4 text-[var(--brand-primary)]" />
                                    First Name
                                </label>
                                <input 
                                    type="text" 
                                    required
                                    value={formData.first_name}
                                    onChange={e => setFormData({...formData, first_name: e.target.value})}
                                    className="w-full px-4 py-3 rounded-xl border border-[var(--dark-400)] bg-[var(--dark-700)] text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-[var(--brand-primary)] transition-all"
                                    placeholder="Jane"
                                />
                            </div>
                            
                            {/* Last Name */}
                            <div>
                                <label className="block text-sm font-bold text-[var(--brand-light)] mb-2 flex items-center gap-2">
                                    <User className="w-4 h-4 text-[var(--brand-primary)]" />
                                    Last Name
                                </label>
                                <input 
                                    type="text" 
                                    required
                                    value={formData.last_name}
                                    onChange={e => setFormData({...formData, last_name: e.target.value})}
                                    className="w-full px-4 py-3 rounded-xl border border-[var(--dark-400)] bg-[var(--dark-700)] text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-[var(--brand-primary)] transition-all"
                                    placeholder="Doe"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
                            {/* Phone Number */}
                            <div>
                                <label className="block text-sm font-bold text-[var(--brand-light)] mb-2 flex items-center gap-2">
                                    <Phone className="w-4 h-4 text-[var(--brand-primary)]" />
                                    Phone Number
                                </label>
                                <input 
                                    type="tel" 
                                    value={formData.phone_number}
                                    onChange={e => setFormData({...formData, phone_number: e.target.value})}
                                    className="w-full px-4 py-3 rounded-xl border border-[var(--dark-400)] bg-[var(--dark-700)] text-[var(--brand-light)] placeholder-[var(--brand-light)]/40 focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-[var(--brand-primary)] transition-all"
                                    placeholder="+46 70 123 45 67"
                                />
                            </div>
                            
                            {/* Gender */}
                            <div>
                                <label className="block text-sm font-bold text-[var(--brand-light)] mb-2">Gender</label>
                                <select
                                    value={formData.legal_gender}
                                    onChange={e => setFormData({...formData, legal_gender: e.target.value as 'MALE' | 'FEMALE' | 'OTHER'})}
                                    className="w-full px-4 py-3 h-[50px] rounded-xl border border-[var(--dark-400)] bg-[var(--dark-700)] text-[var(--brand-light)] focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-[var(--brand-primary)] transition-all appearance-none"
                                >
                                    <option value="MALE">Male</option>
                                    <option value="FEMALE">Female</option>
                                    <option value="OTHER">Other</option>
                                </select>
                            </div>
                        </div>

                        {/* Relationship */}
                        <div>
                            <label className="block text-sm font-bold text-[var(--brand-light)] mb-3 flex items-center gap-2">
                                <Shield className="w-4 h-4 text-[var(--brand-primary)]" />
                                Relationship
                            </label>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
                                {['MOTHER', 'FATHER', 'GUARDIAN', 'OTHER'].map(type => (
                                    <button
                                        key={type}
                                        type="button"
                                        onClick={() => setFormData({...formData, relationship_type: type as typeof formData.relationship_type})}
                                        className={`py-3 px-2 rounded-xl text-sm font-bold transition-all ${
                                            formData.relationship_type === type
                                                ? 'bg-[var(--brand-primary)] text-[var(--dark-900)]'
                                                : 'bg-[var(--dark-600)] text-[var(--brand-light)]/70 hover:bg-[var(--dark-500)] hover:text-[var(--brand-light)] border border-[var(--dark-400)]'
                                        }`}
                                    >
                                        {type.charAt(0) + type.slice(1).toLowerCase()}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Primary Checkbox */}
                        <div className="flex items-center gap-3 p-4 sm:p-5 bg-[var(--dark-700)] rounded-xl border border-[var(--dark-500)]">
                            <input 
                                type="checkbox"
                                id="is_primary"
                                checked={formData.is_primary_guardian}
                                onChange={e => setFormData({...formData, is_primary_guardian: e.target.checked})}
                                className="w-5 h-5 text-[var(--brand-primary)] bg-[var(--dark-600)] border-[var(--dark-400)] rounded focus:ring-[var(--brand-primary)] focus:ring-offset-0"
                            />
                            <label htmlFor="is_primary" className="text-sm font-bold text-[var(--brand-light)] cursor-pointer select-none flex items-center gap-2">
                                <CheckCircle className="w-5 h-5 text-[var(--brand-primary)]" />
                                This is my primary guardian
                            </label>
                        </div>

                        {/* Submit */}
                        <button 
                            type="submit" 
                            disabled={loading}
                            className="w-full bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/80 text-[var(--dark-900)] font-bold py-4 rounded-xl transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[var(--dark-900)]"></div>
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <Mail className="w-5 h-5" />
                                    Send Invite / Link Guardian
                                </>
                            )}
                        </button>

                    </form>
                </div>
            </div>
            
            <Toast {...toast} onClose={() => setToast({...toast, isVisible: false})} />
            
            <SuccessModal
                isVisible={successModal.isVisible}
                onClose={handleSuccessModalClose}
                title={successModal.title}
                message={successModal.message}
                buttonText="View Guardians"
                darkMode={true}
            />
        </div>
    );
}

