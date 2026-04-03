import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowPathIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  PaperAirplaneIcon,
  PlusIcon,
  ShieldCheckIcon,
  SparklesIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useDialog } from '../context/DialogContext';

const POLL_INTERVAL = 8000;
const STATUS_LABELS = {
  open: 'Open',
  resolved: 'Resolved',
};

const formatPanelTime = (value) => {
  if (!value) return 'Just now';
  return new Date(value).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatBubbleTime = (value) =>
  new Date(value).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });

const Messages = () => {
  const { isAuthenticated, isAdmin } = useAuth();
  const { showConfirm } = useDialog();
  const navigate = useNavigate();
  const messageEndRef = useRef(null);

  const [conversations, setConversations] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [refreshTick, setRefreshTick] = useState(0);
  const [forceNoSelection, setForceNoSelection] = useState(false);

  const syncChat = async (keepSpinner = false) => {
    if (!keepSpinner) {
      setLoading(true);
    }

    try {
      const response = await api.get('/support/conversations/');
      const list = response.data.results || response.data || [];
      const nextSelectedId =
        forceNoSelection
          ? null
          : selectedId && list.some((conversation) => conversation.id === selectedId)
            ? selectedId
            : list[0]?.id || null;

      setConversations(Array.isArray(list) ? list : []);
      setSelectedId(nextSelectedId);

      if (nextSelectedId) {
        const detailResponse = await api.get(`/support/conversations/${nextSelectedId}/`);
        setSelectedConversation(detailResponse.data);
      } else {
        setSelectedConversation(null);
      }

      setError('');
    } catch (err) {
      setError(err.response?.data?.detail || 'Support messages could not be loaded right now.');
    } finally {
      if (!keepSpinner) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (isAdmin) {
      navigate('/admin-dashboard', { state: { tab: 'support' } });
      return;
    }

    syncChat();
  }, [isAuthenticated, isAdmin, navigate, refreshTick, forceNoSelection]);

  useEffect(() => {
    if (!isAuthenticated || isAdmin) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      syncChat(true);
    }, POLL_INTERVAL);

    return () => window.clearInterval(intervalId);
  }, [isAuthenticated, isAdmin, selectedId, forceNoSelection]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedConversation]);

  const handleSendMessage = async () => {
    const trimmedDraft = draft.trim();
    if (!trimmedDraft) {
      return;
    }

    setSending(true);
    setError('');

    try {
      if (selectedConversation?.id) {
        const response = await api.post(`/support/conversations/${selectedConversation.id}/messages/`, {
          body: trimmedDraft,
        });
        const detail = response.data;
        setSelectedConversation(detail);
        setSelectedId(detail.id);
        setForceNoSelection(false);

        const latestMessage = detail.messages?.[detail.messages.length - 1];
        const previewText = latestMessage?.body || trimmedDraft;

        setConversations((prev) => {
          const nextItem = {
            id: detail.id,
            subject: detail.subject || 'HomeCrew Support Chat',
            status: detail.status || 'open',
            last_message_at: detail.last_message_at || latestMessage?.created_at || new Date().toISOString(),
            last_message_preview: previewText,
            unread_count: 0,
          };

          const others = prev.filter((conversation) => conversation.id !== detail.id);
          return [nextItem, ...others];
        });
      } else {
        const response = await api.post('/support/conversations/', {
          subject: 'HomeCrew Support Chat',
          message: trimmedDraft,
        });
        const detail = response.data;
        setSelectedConversation(detail);
        setSelectedId(detail.id);
        setForceNoSelection(false);

        const latestMessage = detail.messages?.[detail.messages.length - 1];
        const previewText = latestMessage?.body || trimmedDraft;

        setConversations((prev) => {
          const nextItem = {
            id: detail.id,
            subject: detail.subject || 'HomeCrew Support Chat',
            status: detail.status || 'open',
            last_message_at: detail.last_message_at || latestMessage?.created_at || new Date().toISOString(),
            last_message_preview: previewText,
            unread_count: 0,
          };

          const others = prev.filter((conversation) => conversation.id !== detail.id);
          return [nextItem, ...others];
        });
      }

      setDraft('');
    } catch (err) {
      setError(err.response?.data?.detail || 'Message could not be sent. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleNewConversation = () => {
    setForceNoSelection(true);
    setSelectedId(null);
    setSelectedConversation(null);
    setDraft('');
    setError('');
  };

  const handleDeleteConversation = async (conversation) => {
    const title = conversation?.subject || 'this conversation';
    const ok = await showConfirm(`Delete "${title}"? This conversation history will be removed.`, {
      title: 'Delete conversation',
      confirmText: 'Delete',
      cancelText: 'Cancel',
    });
    if (!ok) return;

    try {
      await api.delete(`/support/conversations/${conversation.id}/`);

      setConversations((prev) => prev.filter((item) => item.id !== conversation.id));

      if (selectedId === conversation.id) {
        setSelectedId(null);
        setSelectedConversation(null);
        setForceNoSelection(true);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Conversation could not be deleted right now.');
    }
  };

  const totalUnread = conversations.reduce(
    (sum, conversation) => sum + (conversation.unread_count || 0),
    0
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4">
        <div className="text-center">
          <div className="mx-auto h-14 w-14 rounded-full border-4 border-white/15 border-t-teal-400 animate-spin" />
          <p className="mt-4 text-sm uppercase tracking-[0.24em] text-teal-200">Loading support chat</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(20,184,166,0.18),_transparent_34%),linear-gradient(135deg,#f8fafc_0%,#ecfeff_48%,#ffffff_100%)] px-4 py-10">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="overflow-hidden rounded-[28px] border border-white/10 bg-slate-900/90 text-white shadow-2xl backdrop-blur">
            <div className="border-b border-white/10 px-6 py-7">
              <div className="inline-flex items-center gap-2 rounded-full border border-teal-400/20 bg-teal-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-teal-100">
                <SparklesIcon className="h-4 w-4" />
                Support Desk
              </div>
              <Link
                to="/ai-assistant"
                className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200 transition hover:border-teal-300/40 hover:text-teal-200"
              >
                <SparklesIcon className="h-4 w-4" />
                AI Assistant
              </Link>
              <h1 className="mt-5 text-3xl font-bold leading-tight">Message HomeCrew admin directly</h1>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                Ask about booking issues, service timing, payments, or any household support you need.
              </p>
            </div>

            <div className="space-y-4 px-6 py-6">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-start gap-3">
                  <ShieldCheckIcon className="mt-0.5 h-5 w-5 text-teal-300" />
                  <div>
                    <p className="text-sm font-semibold text-white">Direct admin inbox</p>
                    <p className="mt-1 text-sm text-slate-300">Every message goes to the admin support panel and replies appear here.</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-start gap-3">
                  <ClockIcon className="mt-0.5 h-5 w-5 text-cyan-300" />
                  <div>
                    <p className="text-sm font-semibold text-white">Support flow</p>
                    <p className="mt-1 text-sm text-slate-300">Unread replies: {totalUnread}. Conversation refreshes automatically every few seconds.</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Conversation</p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleNewConversation}
                      className="inline-flex items-center gap-1 rounded-full border border-white/15 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:border-teal-300/40 hover:text-teal-200"
                    >
                      <PlusIcon className="h-3.5 w-3.5" />
                      New
                    </button>
                    <button
                      type="button"
                      onClick={() => syncChat(true)}
                      className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:border-teal-300/40 hover:text-teal-200"
                    >
                      <ArrowPathIcon className="h-3.5 w-3.5" />
                      Refresh
                    </button>
                  </div>
                </div>

                {conversations.length > 0 ? (
                  conversations.map((conversation) => (
                    <div
                      key={conversation.id}
                      className={`w-full rounded-2xl border px-4 py-4 text-left transition ${
                        selectedId === conversation.id
                          ? 'border-teal-300/50 bg-teal-400/10 shadow-lg shadow-teal-500/10'
                          : 'border-white/10 bg-white/5 hover:border-white/25 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setForceNoSelection(false);
                            setSelectedId(conversation.id);
                            setRefreshTick((tick) => tick + 1);
                          }}
                          className="min-w-0 flex-1 text-left"
                        >
                          <p className="truncate font-semibold text-white">{conversation.subject || 'HomeCrew Support Chat'}</p>
                        </button>
                        <div className="flex items-center gap-2">
                          {conversation.unread_count > 0 && (
                            <span className="rounded-full bg-rose-500 px-2.5 py-1 text-[11px] font-bold text-white">
                              {conversation.unread_count}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteConversation(conversation)}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/20 text-slate-300 transition hover:border-rose-300 hover:text-rose-300"
                            aria-label={`Delete ${conversation.subject || 'conversation'}`}
                            title="Delete conversation"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm text-slate-300">{conversation.last_message_preview || 'Start your first message.'}</p>
                      <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                        <span>{STATUS_LABELS[conversation.status] || conversation.status}</span>
                        <span>{formatPanelTime(conversation.last_message_at)}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 px-4 py-10 text-center">
                    <ChatBubbleLeftRightIcon className="mx-auto h-11 w-11 text-slate-500" />
                    <p className="mt-3 font-semibold text-white">No conversation yet</p>
                    <p className="mt-2 text-sm text-slate-400">Write your first message and the admin team will receive it instantly.</p>
                  </div>
                )}
              </div>
            </div>
          </aside>

          <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_32px_120px_rgba(15,23,42,0.18)]">
            <div className="border-b border-slate-200 bg-slate-50 px-6 py-5 sm:px-8">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-600">HomeCrew Messaging</p>
                  <h2 className="mt-2 text-2xl font-bold text-slate-900">
                    {selectedConversation?.subject || 'Start a support chat'}
                  </h2>
                  <p className="mt-2 text-sm text-slate-500">
                    {selectedConversation
                      ? `Last updated ${formatPanelTime(selectedConversation.last_message_at)}`
                      : 'Your chat will open here as soon as you send a message.'}
                  </p>
                </div>

                {selectedConversation && (
                  <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        selectedConversation.status === 'resolved' ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}
                    />
                    {STATUS_LABELS[selectedConversation.status] || selectedConversation.status}
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="border-b border-rose-100 bg-rose-50 px-6 py-4 text-sm text-rose-600 sm:px-8">
                {error}
              </div>
            )}

            <div className="flex min-h-[620px] flex-col">
              <div className="flex-1 space-y-4 overflow-y-auto bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_65%,#ecfeff_100%)] px-6 py-6 sm:px-8">
                {selectedConversation?.messages?.length ? (
                  selectedConversation.messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.from_admin ? 'justify-start' : 'justify-end'}`}
                    >
                      <div
                        className={`max-w-xl rounded-[24px] px-5 py-4 shadow-sm ${
                          message.from_admin
                            ? 'bg-slate-900 text-white'
                            : 'bg-teal-600 text-white'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-4 text-xs uppercase tracking-[0.18em] text-white/70">
                          <span>{message.from_admin ? 'Admin Reply' : 'You'}</span>
                          <span>{formatBubbleTime(message.created_at)}</span>
                        </div>
                        <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-white/95">{message.body}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex h-full min-h-[380px] items-center justify-center">
                    <div className="max-w-md text-center">
                      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-teal-50 text-teal-600">
                        <ChatBubbleLeftRightIcon className="h-10 w-10" />
                      </div>
                      <h3 className="mt-6 text-2xl font-bold text-slate-900">Talk to the admin team</h3>
                      <p className="mt-3 text-sm leading-7 text-slate-500">
                        Ask questions about orders, payments, or any service issue. Your message goes straight to the admin support section.
                      </p>
                    </div>
                  </div>
                )}
                <div ref={messageEndRef} />
              </div>

              <div className="border-t border-slate-200 bg-white px-6 py-5 sm:px-8">
                <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-3">
                  <textarea
                    rows={4}
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Write your message for HomeCrew admin..."
                    className="w-full resize-none border-none bg-transparent px-3 py-2 text-sm text-slate-700 outline-none placeholder:text-slate-400"
                  />

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-3 pt-3">
                    <p className="text-xs text-slate-400">
                      Press `Enter` to send, `Shift + Enter` for a new line.
                    </p>
                    <button
                      type="button"
                      onClick={handleSendMessage}
                      disabled={sending || !draft.trim()}
                      className="inline-flex items-center gap-2 rounded-full bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {sending ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <PaperAirplaneIcon className="h-4 w-4" />}
                      {sending ? 'Sending...' : 'Send Message'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Messages;
