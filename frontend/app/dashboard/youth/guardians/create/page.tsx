'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import NavBar from '@/app/components/NavBar';
import { inviteGuardian } from '@/lib/api';
import Toast from '@/app/components/Toast';
import SuccessModal from '@/app/components/SuccessModal';

export default function AddGuardianPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
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
        <div className="min-h-screen bg-gray-100 pb-20">
            <NavBar />
            <div className="max-w-2xl mx-auto p-4 lg:p-8">
                
                {/* Header */}
                <div className="mb-8">
                    <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-800 text-sm font-medium mb-4 flex items-center gap-1">
                        ← Back
                    </button>
                    <h1 className="text-2xl font-bold text-gray-900">Add Guardian</h1>
                    <p className="text-gray-500 mt-1">
                        Enter their details below. If they already have an account, we will link them. 
                        Otherwise, we will send them an invite.
                    </p>
                </div>

                {/* Form */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        
                        {/* Email */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Email Address</label>
                            <input 
                                type="email" 
                                required
                                value={formData.email}
                                onChange={e => setFormData({...formData, email: e.target.value})}
                                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                placeholder="guardian@example.com"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* First Name */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">First Name</label>
                                <input 
                                    type="text" 
                                    required
                                    value={formData.first_name}
                                    onChange={e => setFormData({...formData, first_name: e.target.value})}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                    placeholder="Jane"
                                />
                            </div>
                            
                            {/* Last Name */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Last Name</label>
                                <input 
                                    type="text" 
                                    required
                                    value={formData.last_name}
                                    onChange={e => setFormData({...formData, last_name: e.target.value})}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                    placeholder="Doe"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Phone Number */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Phone Number</label>
                                <input 
                                    type="tel" 
                                    value={formData.phone_number}
                                    onChange={e => setFormData({...formData, phone_number: e.target.value})}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                    placeholder="+46 70 123 45 67"
                                />
                            </div>
                            
                            {/* Gender */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Gender</label>
                                <select
                                    value={formData.legal_gender}
                                    onChange={e => setFormData({...formData, legal_gender: e.target.value as 'MALE' | 'FEMALE' | 'OTHER'})}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                >
                                    <option value="MALE">Male</option>
                                    <option value="FEMALE">Female</option>
                                    <option value="OTHER">Other</option>
                                </select>
                            </div>
                        </div>

                        {/* Relationship */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Relationship</label>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {['MOTHER', 'FATHER', 'GUARDIAN', 'OTHER'].map(type => (
                                    <button
                                        key={type}
                                        type="button"
                                        onClick={() => setFormData({...formData, relationship_type: type as typeof formData.relationship_type})}
                                        className={`py-3 px-2 rounded-xl text-sm font-semibold border-2 transition-all ${
                                            formData.relationship_type === type
                                                ? 'border-blue-600 bg-blue-50 text-blue-700'
                                                : 'border-transparent bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                    >
                                        {type.charAt(0) + type.slice(1).toLowerCase()}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Primary Checkbox */}
                        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
                            <input 
                                type="checkbox"
                                id="is_primary"
                                checked={formData.is_primary_guardian}
                                onChange={e => setFormData({...formData, is_primary_guardian: e.target.checked})}
                                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
                            />
                            <label htmlFor="is_primary" className="text-sm font-medium text-gray-700 cursor-pointer select-none">
                                This is my primary guardian
                            </label>
                        </div>

                        {/* Submit */}
                        <button 
                            type="submit" 
                            disabled={loading}
                            className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-blue-700 transition-transform active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Processing...' : 'Send Invite / Link Guardian'}
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
            />
        </div>
    );
}

