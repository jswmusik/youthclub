'use client';

import { useEffect, useState, Suspense } from 'react';
import api from '../../../../lib/api';
import Toast from '../../../components/Toast';
import { useAuth } from '../../../../context/AuthContext';
import DeleteConfirmationModal from '../../../components/DeleteConfirmationModal';

interface SystemMessage {
  id: number;
  title: string;
  message: string;
  message_type: 'INFO' | 'IMPORTANT' | 'WARNING';
  created_at: string;
  expires_at: string;
  is_sticky: boolean;
  external_link?: string | null;
}

const MESSAGE_STYLES: Record<SystemMessage['message_type'], { badge: string; border: string }> = {
  INFO: {
    badge: 'bg-blue-100 text-blue-800',
    border: 'border-blue-200',
  },
  IMPORTANT: {
    badge: 'bg-orange-100 text-orange-800',
    border: 'border-orange-200',
  },
  WARNING: {
    badge: 'bg-red-100 text-red-800',
    border: 'border-red-200',
  },
};

const formatDate = (value: string) =>
  new Date(value).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

function ClubMessageBoardContent() {
  const [messages, setMessages] = useState<SystemMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; isVisible: boolean }>({
    message: '',
    type: 'success',
    isVisible: false,
  });
  const { refreshMessageCount } = useAuth();
  
  // Hide Confirmation Modal State
  const [showHideModal, setShowHideModal] = useState(false);
  const [messageToHide, setMessageToHide] = useState<{ id: number; title: string } | null>(null);
  const [isHiding, setIsHiding] = useState(false);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const res = await api.get('/messages/active_list/');
      const list: SystemMessage[] = Array.isArray(res.data) ? res.data : [];
      list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setMessages(list);
      refreshMessageCount();
    } catch (err) {
      console.error(err);
      setToast({ message: 'Failed to load messages.', type: 'error', isVisible: true });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  const handleHideClick = (msg: SystemMessage) => {
    if (msg.is_sticky) return;
    setMessageToHide({ id: msg.id, title: msg.title });
    setShowHideModal(true);
  };

  const handleHideConfirm = async () => {
    if (!messageToHide) return;

    setIsHiding(true);
    try {
      await api.post(`/messages/${messageToHide.id}/dismiss/`);
      setToast({ message: 'Message hidden.', type: 'success', isVisible: true });
      setShowHideModal(false);
      setMessageToHide(null);
      fetchMessages();
    } catch (err) {
      console.error(err);
      setToast({ message: 'Failed to hide message.', type: 'error', isVisible: true });
    } finally {
      setIsHiding(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <p className="text-sm text-blue-500 uppercase font-semibold tracking-wide">Club Admin</p>
          <h1 className="text-3xl font-bold text-gray-900">Internal Message Board</h1>
          <p className="text-gray-600">All active notices targeted to your role appear here.</p>
        </div>
        <button
          onClick={fetchMessages}
          className="px-4 py-2 rounded-lg border border-blue-200 text-sm text-blue-700 hover:bg-blue-50"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl shadow p-6 text-center text-gray-500">Loading messages…</div>
      ) : messages.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-8 text-center text-gray-500">
          No active messages for your role right now.
        </div>
      ) : (
        <div className="space-y-4">
          {messages.map((msg) => {
            const styles = MESSAGE_STYLES[msg.message_type] || MESSAGE_STYLES.INFO;
            return (
              <div
                key={msg.id}
                className={`bg-white border ${styles.border} rounded-xl shadow-sm p-5 flex flex-col gap-3`}
              >
                <div className="flex flex-wrap justify-between items-start gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${styles.badge}`}>
                        {msg.message_type}
                      </span>
                      {msg.is_sticky && (
                        <span className="text-[11px] uppercase tracking-wide text-red-500 font-semibold">
                          Sticky
                        </span>
                      )}
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900 mt-1">{msg.title}</h2>
                  </div>
                  <div className="text-right text-xs text-gray-500">
                    <div>Created: {formatDate(msg.created_at)}</div>
                    <div>Expires: {formatDate(msg.expires_at)}</div>
                  </div>
                </div>

                <p className="text-gray-700 whitespace-pre-line">{msg.message}</p>

                {msg.external_link && (
                  <a
                    href={msg.external_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 font-semibold hover:underline"
                  >
                    View more ↗
                  </a>
                )}

                <div className="flex justify-end gap-3 text-sm">
                  <button
                    onClick={() => handleHideClick(msg)}
                    disabled={msg.is_sticky}
                    className={`px-4 py-2 rounded-lg border text-sm font-semibold transition ${
                      msg.is_sticky
                        ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                        : 'border-red-200 text-red-600 hover:bg-red-50'
                    }`}
                  >
                    Hide
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Hide Confirmation Modal */}
      <DeleteConfirmationModal
        isVisible={showHideModal}
        onClose={() => {
          if (!isHiding) {
            setShowHideModal(false);
            setMessageToHide(null);
          }
        }}
        onConfirm={handleHideConfirm}
        title="Hide Message"
        itemName={messageToHide?.title}
        message={messageToHide ? `Are you sure you want to hide "${messageToHide.title}"? You can refresh the page to see it again.` : undefined}
        confirmButtonText="Hide"
        isLoading={isHiding}
      />

      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={() => setToast({ ...toast, isVisible: false })}
      />
    </div>
  );
}

export default function ClubMessageBoardPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading message board…</div>}>
      <ClubMessageBoardContent />
    </Suspense>
  );
}

