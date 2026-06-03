import { useEffect, useMemo, useState } from 'react';
import { MessageCircle, Plus, Search, Send, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { Avatar, Badge, Button, Card, Input, Modal } from '../common/UI';
import { useAuth } from '../../context/AuthContext';
import { useApi, useMutation } from '../../hooks/useApi';
import { formatDate } from '../../utils/helpers';

export default function StaffChatPage() {
  const { user, isAdmin } = useAuth();
  const [activeThread, setActiveThread] = useState(null);
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [showNewThread, setShowNewThread] = useState(false);

  const { data: threadsData, loading, refetch } = useApi('/chat/threads');
  const { data: messagesData, refetch: refetchMessages } = useApi(
    activeThread ? `/chat/threads/${activeThread.id}/messages` : null,
    { immediate: !!activeThread, deps: [activeThread?.id] }
  );
  const { mutate: sendMessage, loading: sending } = useMutation();
  const threads = Array.isArray(threadsData) ? threadsData : [];
  const messages = Array.isArray(messagesData) ? messagesData : [];

  useEffect(() => {
    if (!activeThread && threads.length) setActiveThread(threads[0]);
  }, [threads, activeThread]);

  const filteredThreads = useMemo(() => {
    const term = search.toLowerCase();
    return threads.filter((thread) => !term || thread.title.toLowerCase().includes(term));
  }, [threads, search]);

  const submitMessage = async () => {
    if (!activeThread || !message.trim()) return;
    const { success } = await sendMessage(`/chat/threads/${activeThread.id}/messages`, { body: message });
    if (success) {
      setMessage('');
      refetchMessages();
      refetch();
    } else {
      toast.error('Message could not be sent');
    }
  };

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: 'var(--sp-6)' }}>
        <h1 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-display)', fontWeight: 700 }}>Staff Chat</h1>
        <p style={{ color: 'var(--sp-slate-500)', fontSize: '0.875rem', marginTop: 'var(--sp-1)' }}>
          Real-time staff coordination for announcements, class operations, welfare, and urgent school decisions.
        </p>
      </div>

      <Card padding={false}>
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', minHeight: 640 }} className="chat-shell">
          <aside style={{ borderRight: '1px solid var(--sp-border-subtle)', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <div style={{ padding: 'var(--sp-4)', borderBottom: '1px solid var(--sp-border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
                  <MessageCircle size={18} style={{ color: 'var(--sp-green-600)' }} />
                  <strong>Channels</strong>
                </div>
                {isAdmin && <Button size="sm" icon={Plus} onClick={() => setShowNewThread(true)}>New</Button>}
              </div>
              <Input icon={Search} placeholder="Search chats..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>

            <div style={{ overflowY: 'auto', flex: 1 }}>
              {loading ? (
                <p style={{ padding: 'var(--sp-4)', color: 'var(--sp-slate-400)' }}>Loading chats...</p>
              ) : filteredThreads.map((thread) => {
                const isActive = activeThread?.id === thread.id;
                return (
                  <button
                    key={thread.id}
                    onClick={() => setActiveThread(thread)}
                    style={{
                      width: '100%', border: 'none', background: isActive ? 'var(--sp-green-50)' : 'transparent',
                      textAlign: 'left', padding: 'var(--sp-4)', cursor: 'pointer',
                      borderBottom: '1px solid var(--sp-border-subtle)', fontFamily: 'var(--font-body)',
                    }}
                  >
                    <div style={{ display: 'flex', gap: 'var(--sp-3)', alignItems: 'center' }}>
                      <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--sp-green-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--sp-green-700)' }}>
                        <Users size={18} />
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <p style={{ fontWeight: 700, color: 'var(--sp-slate-900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{thread.title}</p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--sp-slate-500)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {thread.last_message || 'No messages yet'}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          <section style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <div style={{ padding: 'var(--sp-4) var(--sp-5)', borderBottom: '1px solid var(--sp-border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '1rem', fontWeight: 800 }}>{activeThread?.title || 'Select a chat'}</h2>
                <p style={{ fontSize: '0.75rem', color: 'var(--sp-slate-500)' }}>Secure school staff workspace</p>
              </div>
              {activeThread && <Badge variant="green">{activeThread.type}</Badge>}
            </div>

            <div style={{ flex: 1, padding: 'var(--sp-5)', background: '#F7FAF8', overflowY: 'auto' }}>
              {!activeThread ? (
                <p style={{ color: 'var(--sp-slate-400)', textAlign: 'center', marginTop: 'var(--sp-12)' }}>Choose a channel to start</p>
              ) : messages.length ? messages.map((item) => {
                const mine = item.sender_id === user?.id;
                return (
                  <div key={item.id} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start', marginBottom: 'var(--sp-3)' }}>
                    <div style={{ display: 'flex', gap: 'var(--sp-2)', maxWidth: '75%', flexDirection: mine ? 'row-reverse' : 'row' }}>
                      <Avatar firstName={item.first_name} lastName={item.last_name} src={item.avatar_url} size={30} />
                      <div>
                        <div style={{
                          background: mine ? 'var(--sp-green-700)' : 'white',
                          color: mine ? 'white' : 'var(--sp-slate-900)',
                          borderRadius: 8,
                          padding: '0.65rem 0.8rem',
                          boxShadow: 'var(--shadow-sm)',
                        }}>
                          <p style={{ fontSize: '0.875rem', lineHeight: 1.5 }}>{item.body}</p>
                        </div>
                        <p style={{ fontSize: '0.6875rem', color: 'var(--sp-slate-400)', marginTop: 4, textAlign: mine ? 'right' : 'left' }}>
                          {mine ? 'You' : `${item.first_name || 'Staff'} ${item.last_name || ''}`} · {formatDate(item.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              }) : (
                <p style={{ color: 'var(--sp-slate-400)', textAlign: 'center', marginTop: 'var(--sp-12)' }}>No messages yet</p>
              )}
            </div>

            <div style={{ padding: 'var(--sp-4)', borderTop: '1px solid var(--sp-border-subtle)', display: 'flex', gap: 'var(--sp-3)' }}>
              <input
                value={message}
                onChange={e => setMessage(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') submitMessage(); }}
                placeholder="Type a message..."
                style={{ flex: 1, border: '1px solid var(--sp-border)', borderRadius: 'var(--radius-md)', padding: '0.75rem 0.9rem', fontFamily: 'var(--font-body)', outline: 'none' }}
              />
              <Button icon={Send} loading={sending} onClick={submitMessage}>Send</Button>
            </div>
          </section>
        </div>
      </Card>

      <NewThreadModal isOpen={showNewThread} onClose={() => setShowNewThread(false)} onSuccess={() => { setShowNewThread(false); refetch(); }} />

      <style>{`
        @media (max-width: 820px) {
          .chat-shell { grid-template-columns: 1fr !important; }
          .chat-shell aside { border-right: none !important; border-bottom: 1px solid var(--sp-border-subtle); max-height: 320px; }
        }
      `}</style>
    </div>
  );
}

function NewThreadModal({ isOpen, onClose, onSuccess }) {
  const [title, setTitle] = useState('');
  const { mutate, loading } = useMutation();

  const submit = async () => {
    if (!title.trim()) return toast.error('Enter a channel name');
    const { success } = await mutate('/chat/threads', { title, type: 'staff' });
    if (success) {
      toast.success('Staff channel created');
      setTitle('');
      onSuccess();
    } else {
      toast.error('Could not create channel');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Staff Channel">
      <Input label="Channel Name" value={title} onChange={e => setTitle(e.target.value)} placeholder="Admissions Team" />
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--sp-3)' }}>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button loading={loading} onClick={submit}>Create Channel</Button>
      </div>
    </Modal>
  );
}
