import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowsPointingOutIcon,
  PaperAirplaneIcon,
  SparklesIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import api from '../api/axios';

const MINI_WELCOME_MESSAGE = 'হাই! 👋 আমি HomeCrew AI Assistant। আপনি চাইলে এখানেই ছোট করে প্রশ্ন করতে পারেন';

const ChatbotIcon = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const endRef = useRef(null);

  const [popupOpen, setPopupOpen] = useState(false);
  const [popupClosing, setPopupClosing] = useState(false);
  const [iconSpin, setIconSpin] = useState('');
  const [sending, setSending] = useState(false);
  const [text, setText] = useState('');
  const [miniSessionId, setMiniSessionId] = useState(null);
  const [miniContext, setMiniContext] = useState({});
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: MINI_WELCOME_MESSAGE,
    },
  ]);

  const shouldHide = useMemo(() => location.pathname === '/ai-assistant', [location.pathname]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, popupOpen]);

  useEffect(() => {
    if (!popupOpen) return undefined;
    const onEsc = (event) => {
      if (event.key === 'Escape') {
        hardClosePopup();
      }
    };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [popupOpen]);

  useEffect(() => {
    if (shouldHide) return;
    const shouldReopen = sessionStorage.getItem('chatbot_open_popup') === '1';
    if (shouldReopen) {
      sessionStorage.removeItem('chatbot_open_popup');
      setIconSpin('cw');
      setPopupOpen(true);
      setPopupClosing(false);
      window.setTimeout(() => setIconSpin(''), 460);
    }
  }, [shouldHide]);

  const handleToggle = (forcedAction = null) => {
    const wantsClose = forcedAction ? forcedAction === 'close' : popupOpen && !popupClosing;

    if (wantsClose) {
      setIconSpin('ccw');
      setPopupClosing(true);
      window.setTimeout(() => {
        setPopupOpen(false);
        setPopupClosing(false);
      }, 280);
    } else {
      setIconSpin('cw');
      setPopupOpen(true);
      setPopupClosing(false);
    }

    window.setTimeout(() => setIconSpin(''), 460);
  };

  const resetMiniConversation = () => {
    setText('');
    setMiniSessionId(null);
    setMiniContext({});
    setMessages([{ role: 'assistant', text: MINI_WELCOME_MESSAGE }]);
    sessionStorage.removeItem('chatbot_last_mini_session_id');
  };

  const hardClosePopup = () => {
    setIconSpin('ccw');
    setPopupClosing(true);
    window.setTimeout(() => {
      setPopupOpen(false);
      setPopupClosing(false);
      resetMiniConversation();
    }, 280);
    window.setTimeout(() => setIconSpin(''), 460);
  };

  const sendMiniMessage = async () => {
    const body = text.trim();
    if (!body || sending) return;

    setMessages((prev) => [...prev, { role: 'user', text: body }]);
    setText('');
    setSending(true);

    try {
      let sessionId = miniSessionId;

      // Always create an explicit new session for mini popup when needed,
      // so messages never leak into an older session.
      if (!sessionId) {
        const created = await api.post('/assistant/sessions/', { title: 'Quick Chat' });
        sessionId = created.data?.id || null;
        if (sessionId) {
          setMiniSessionId(sessionId);
          sessionStorage.setItem('chatbot_last_mini_session_id', String(sessionId));
        }
      }

      const response = await api.post('/assistant/chat/', {
        message: body,
        session_id: sessionId,
        context: miniContext,
      });

      const payload = response.data || {};
      const reply = payload.reply || 'Assistant reply পাওয়া যায়নি. আবার চেষ্টা করুন।';

      if (payload.session_id) {
        setMiniSessionId(payload.session_id);
        sessionStorage.setItem('chatbot_last_mini_session_id', String(payload.session_id));
      }
      if (payload.context) {
        setMiniContext((prev) => ({ ...prev, ...payload.context }));
      }

      setMessages((prev) => [...prev, { role: 'assistant', text: reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: 'এখন mini chat unavailable. উপরের zoom button থেকে full page open করে চেষ্টা করুন।',
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  if (shouldHide) return null;

  return (
    <>
      {popupOpen && (
        <div className={`chatbot-mini-popup fixed bottom-24 right-6 z-[70] w-[min(92vw,360px)] rounded-2xl border border-teal-200 bg-white shadow-2xl sm:right-8 ${popupClosing ? 'chatbot-mini-pop-exit' : 'chatbot-mini-pop-enter'}`}>
          <div className="flex items-center justify-between rounded-t-2xl bg-gradient-to-r from-teal-600 to-cyan-600 px-3 py-2.5 text-white">
            <div className="flex items-center gap-2">
              <SparklesIcon className="h-5 w-5" />
              <span className="text-sm font-semibold">AI Quick Chat</span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  const activeMiniSessionId = miniSessionId || sessionStorage.getItem('chatbot_last_mini_session_id');
                  if (activeMiniSessionId) {
                    navigate(`/ai-assistant?session_id=${activeMiniSessionId}&from_popup=1`);
                  } else {
                    navigate('/ai-assistant?from_popup=1');
                  }
                  setPopupOpen(false);
                  setPopupClosing(false);
                }}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/15 transition hover:bg-white/30"
                title="Open full details"
                aria-label="Open full details"
              >
                <ArrowsPointingOutIcon className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={hardClosePopup}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/15 transition hover:bg-white/30"
                title="Close"
                aria-label="Close quick chat"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="max-h-72 space-y-2 overflow-y-auto bg-slate-50 px-3 py-3">
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={`flex ${message.role === 'assistant' ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-6 ${message.role === 'assistant' ? 'bg-white text-slate-700 border border-slate-200' : 'bg-teal-600 text-white'}`}>
                  {message.text}
                </div>
              </div>
            ))}
            <div ref={endRef} />
          </div>

          <div className="border-t border-slate-200 p-2.5">
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 py-1.5">
              <input
                value={text}
                onChange={(event) => setText(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    sendMiniMessage();
                  }
                }}
                placeholder="Write a message..."
                className="flex-1 border-none bg-transparent px-1 text-sm text-slate-700 outline-none placeholder:text-slate-400"
              />
              <button
                type="button"
                onClick={sendMiniMessage}
                disabled={sending || !text.trim()}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-teal-600 text-white transition hover:bg-teal-700 disabled:opacity-50"
                title="Send"
                aria-label="Send quick message"
              >
                <PaperAirplaneIcon className={`h-4 w-4 ${sending ? 'animate-pulse' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => handleToggle()}
        className={`group fixed bottom-6 right-6 z-[80] flex h-14 w-14 items-center justify-center rounded-full bg-teal-600 text-white shadow-lg shadow-teal-500/40 transition-all duration-300 hover:scale-110 hover:bg-teal-500 hover:shadow-teal-400/50 focus:outline-none focus:ring-4 focus:ring-teal-300 active:scale-95 sm:bottom-8 sm:right-8 ${iconSpin === 'cw' ? 'chatbot-icon-spin-cw' : ''} ${iconSpin === 'ccw' ? 'chatbot-icon-spin-ccw' : ''}`}
        aria-label="Toggle AI Assistant quick chat"
        title="Ask AI Assistant"
      >
        <div className="absolute -inset-2 animate-pulse rounded-full border-2 border-teal-400/40 opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
        <SparklesIcon className="relative z-10 h-6 w-6" />

        <span className="pointer-events-none absolute right-full mr-4 translate-x-2 whitespace-nowrap rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-teal-300 opacity-0 shadow-xl transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100">
          {popupOpen && !popupClosing ? 'Minimize Quick Chat' : 'Open Quick Chat'}
          <span className="absolute top-1/2 -right-1.5 -translate-y-1/2 border-4 border-transparent border-l-slate-800"></span>
        </span>
      </button>
    </>
  );
};

export default ChatbotIcon;
