import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowsPointingInIcon,
  ArrowPathIcon,
  CalendarDaysIcon,
  ChatBubbleLeftRightIcon,
  MapPinIcon,
  PaperAirplaneIcon,
  PlusIcon,
  SparklesIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import api from '../api/axios';
import { useDialog } from '../context/DialogContext';
import VoiceButton from '../components/chat/VoiceButton';
import SmartReplyList from '../components/chat/SmartReplyList';
import RecommendationCard from '../components/chat/RecommendationCard';
import ImageUploadButton from '../components/chat/ImageUploadButton';
import CameraCaptureButton from '../components/chat/CameraCaptureButton';
import ImagePreview from '../components/chat/ImagePreview';

const DEFAULT_CONTEXT = {
  service_id: null,
  booking_date: '',
  location: '',
  booking_name: '',
  booking_phone: '',
  confirm_booking: false,
  order_id: null,
  awaiting_order_id: false,
  pending_rating: null,
};

const QUICK_PROMPTS = [
  'AC servicing cost koto?',
  'Amar fan problem, kon service lagbe?',
  'Ami booking korte chai',
  'Order status dekhao',
  '5 star feedback dite chai',
  'Mirpur e available slot ache?',
];

const KEYWORD_RULES = [
  {
    keys: ['ac', 'air conditioner', 'cooling', 'এসি', 'ac problem', 'ac issue'],
    smartReplies: ['Price koto?', 'Kobe asbe?', 'Nearby technician', 'Gas refill lagbe?'],
    recommendations: [
      {
        id: 'ac-1',
        serviceType: 'AC Servicing',
        technicianName: 'Md. Rahim',
        rating: 4.8,
        priceEstimate: '৳1200 - ৳1800',
        bookPrompt: 'Ami AC servicing book korte chai',
      },
      {
        id: 'ac-2',
        serviceType: 'AC Gas Refill',
        technicianName: 'Shahid Hasan',
        rating: 4.7,
        priceEstimate: '৳2200 - ৳3200',
        bookPrompt: 'Ami AC gas refill er booking korte chai',
      },
    ],
  },
  {
    keys: ['fan', 'ceiling fan', 'pakha', 'পাখা', 'wiring', 'electric', 'ফ্যান', 'ইলেকট্রিক', 'ইলেকট্রিশিয়ান'],
    smartReplies: ['Technician kokhon free?', 'Estimated cost bolo', 'Urgent service possible?'],
    recommendations: [
      {
        id: 'elec-1',
        serviceType: 'Fan Repair & Wiring',
        technicianName: 'Naim Uddin',
        rating: 4.6,
        priceEstimate: '৳700 - ৳1500',
        bookPrompt: 'Fan repair and wiring service book korte chai',
      },
    ],
  },
  {
    keys: ['clean', 'cleaning', 'deep clean', 'kitchen', 'rannaghor', 'রান্নাঘর', 'nongra', 'nogra', 'নোংরা', 'sofa', 'ক্লিন', 'পরিষ্কার', 'সোফা'],
    smartReplies: ['Package ki ki?', 'Koto somoy lagbe?', 'Discount ache?'],
    recommendations: [
      {
        id: 'clean-1',
        serviceType: 'Home Deep Cleaning',
        technicianName: 'Tania Sultana',
        rating: 4.9,
        priceEstimate: '৳2500 - ৳5000',
        bookPrompt: 'Home deep cleaning service book korte chai',
      },
      {
        id: 'clean-2',
        serviceType: 'Sofa Cleaning',
        technicianName: 'Rifat Karim',
        rating: 4.7,
        priceEstimate: '৳900 - ৳1800',
        bookPrompt: 'Sofa cleaning service book korte chai',
      },
    ],
  },
];

const DEFAULT_SMART_REPLIES = ['Price koto?', 'Available slot ache?', 'Ami booking korte chai'];

const getRuleByMessage = (message = '') => {
  const text = message.toLowerCase();
  return KEYWORD_RULES.find((rule) => rule.keys.some((key) => text.includes(key)));
};

const getSmartRepliesForMessage = (message = '') => {
  const rule = getRuleByMessage(message);
  return (rule?.smartReplies || DEFAULT_SMART_REPLIES).slice(0, 5);
};

const getRecommendationsForMessage = (message = '') => {
  const rule = getRuleByMessage(message);
  return (rule?.recommendations || []).slice(0, 3);
};

const getRecommendationsFromDetection = (detection = {}) => {
  const suggestedService = String(detection?.suggested_service || '').trim();
  const problemType = String(detection?.problem_type || '').trim();
  const combined = `${suggestedService} ${problemType}`.trim();

  if (!combined) return [];

  const fromKeywords = getRecommendationsForMessage(combined);
  if (fromKeywords.length) return fromKeywords;

  return [
    {
      id: `detected-${suggestedService || 'general'}`,
      serviceType: suggestedService || 'General Technician Service',
      technicianName: 'On-demand Technician',
      rating: 4.7,
      priceEstimate: '৳800 - ৳2200',
      bookPrompt: `Ami ${suggestedService || 'general service'} book korte chai`,
    },
  ];
};

const Assistant = () => {
  const navigate = useNavigate();
  const { showConfirm, showAlert } = useDialog();
  const [searchParams] = useSearchParams();
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [paymentStartingOrderId, setPaymentStartingOrderId] = useState(null);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [serviceVisibleCounts, setServiceVisibleCounts] = useState({});

  const [context, setContext] = useState(DEFAULT_CONTEXT);
  const [services, setServices] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [voiceHint, setVoiceHint] = useState('');
  const [voiceLanguage, setVoiceLanguage] = useState('bn-BD');
  const [smartReplies, setSmartReplies] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [imageApiResponse, setImageApiResponse] = useState(null);
  const [imageAnalyzing, setImageAnalyzing] = useState(false);
  const recognitionRef = useRef(null);
  const sendMessageRef = useRef(null);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: 'Hi! I can help with service info, booking, recommendation, order tracking, feedback, and availability.',
      data: null,
    },
  ]);

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId) || null,
    [sessions, activeSessionId]
  );

  const canSend = useMemo(
    () => (text.trim().length > 0 || Boolean(uploadedImage)) && !loading && !imageAnalyzing,
    [text, uploadedImage, loading, imageAnalyzing]
  );

  const pushMessage = (role, messageText, data = null, extra = {}) => {
    setMessages((prev) => [...prev, { role, text: messageText, data, ...extra }]);
  };

  const fileToDataUrl = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleImageSelect = async (file) => {
    if (!file) return;
    if (!file.type?.startsWith('image/')) {
      setVoiceHint('Please select a valid image file.');
      return;
    }

    try {
      const dataUrl = await fileToDataUrl(file);
      setUploadedImage(file);
      setPreviewUrl(dataUrl);
      setImageApiResponse(null);
    } catch {
      setUploadedImage(null);
      setPreviewUrl('');
    }
  };

  const clearSelectedImage = () => {
    setUploadedImage(null);
    setPreviewUrl('');
  };

  const increaseVisibleServices = (messageKey, totalCount) => {
    setServiceVisibleCounts((prev) => ({
      ...prev,
      [messageKey]: Math.min((prev[messageKey] || 10) + 10, totalCount),
    }));
  };

  const mapApiMessages = (apiMessages = []) =>
    apiMessages.map((message) => ({
      role: message.role,
      text: message.text,
      data: message.data || null,
      type: message.data?.message_type || null,
    }));

  const loadSessions = async () => {
    setSessionsLoading(true);
    try {
      const response = await api.get('/assistant/sessions/');
      const list = Array.isArray(response.data) ? response.data : [];
      setSessions(list);

      if (!activeSessionId && list.length > 0) {
        setActiveSessionId(list[0].id);
        await openSession(list[0].id);
      }
    } catch {
      setSessions([]);
    } finally {
      setSessionsLoading(false);
    }
  };

  const openSession = async (sessionId) => {
    try {
      const response = await api.get(`/assistant/sessions/${sessionId}/`, {
        params: { limit: 120 },
      });
      const payload = response.data || {};

      setActiveSessionId(payload.id || sessionId);
      setContext({ ...DEFAULT_CONTEXT, ...(payload.context || {}) });
      setServiceVisibleCounts({});

      const restored = mapApiMessages(payload.messages || []);
      setMessages(
        restored.length > 0
          ? restored
          : [
              {
                role: 'assistant',
                text: 'Session loaded. Ask me anything.',
                data: null,
              },
            ]
      );
    } catch {
      // ignore detail load failure
    }
  };

  const createNewSession = async () => {
    try {
      const response = await api.post('/assistant/sessions/', { title: 'New Chat' });
      const session = response.data;
      if (!session?.id) return;

      setSessions((prev) => [
        {
          id: session.id,
          title: session.title || 'New Chat',
          last_message_preview: '',
          last_message_at: session.last_message_at,
          created_at: session.created_at,
          updated_at: session.updated_at,
        },
        ...prev,
      ]);

      setActiveSessionId(session.id);
      setContext(DEFAULT_CONTEXT);
      setServiceVisibleCounts({});
      setMessages([
        {
          role: 'assistant',
          text: 'New chat created. Tell me your service issue or booking request.',
          data: null,
        },
      ]);
    } catch {
      // silent
    }
  };

  const handleDeleteSession = async (sessionId, sessionTitle = 'this chat') => {
    const ok = await showConfirm(`Delete "${sessionTitle}"? This chat history will be removed.`, {
      title: 'Delete chat',
      confirmText: 'Delete',
      cancelText: 'Cancel',
    });
    if (!ok) return;

    try {
      await api.delete(`/assistant/sessions/${sessionId}/`);

      const nextSessions = sessions.filter((item) => item.id !== sessionId);
      setSessions(nextSessions);

      if (activeSessionId === sessionId) {
        if (nextSessions.length > 0) {
          openSession(nextSessions[0].id);
        } else {
          setActiveSessionId(null);
          setContext(DEFAULT_CONTEXT);
          setServiceVisibleCounts({});
          setMessages([
            {
              role: 'assistant',
              text: 'Hi! I can help with service info, booking, recommendation, order tracking, feedback, and availability.',
              data: null,
            },
          ]);
        }
      }
    } catch {
      await showAlert('Sorry, this chat could not be deleted right now. Please try again.', {
        title: 'Delete failed',
      });
    }
  };

  useEffect(() => {
    const loadServices = async () => {
      try {
        const response = await api.get('/services/?page_size=50');
        const list = response.data.results || response.data || [];
        setServices(Array.isArray(list) ? list : []);
      } catch {
        setServices([]);
      }
    };

    loadServices();
    loadSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const popupSessionId = searchParams.get('session_id');
    const fromPopup = searchParams.get('from_popup') === '1';
    const paymentStatus = (searchParams.get('payment') || '').toLowerCase();

    if (!fromPopup || paymentStatus || !popupSessionId) return;

    const targetId = Number(popupSessionId);
    if (!Number.isFinite(targetId)) return;

    openSession(targetId).finally(() => {
      navigate('/ai-assistant', { replace: true });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const sendMessage = async (messageText) => {
    const body = (messageText ?? text).trim();
    if (!body || loading) return;

    let sessionId = activeSessionId;

    // If no session exists, create one first
    if (!sessionId) {
      try {
        const response = await api.post('/assistant/sessions/', { title: body.slice(0, 70) || 'New Chat' });
        const created = response.data;
        sessionId = created?.id;
        if (sessionId) {
          setActiveSessionId(sessionId);
          setSessions((prev) => [
            {
              id: sessionId,
              title: created.title || body.slice(0, 70) || 'New Chat',
              last_message_preview: '',
              last_message_at: created.last_message_at,
              created_at: created.created_at,
              updated_at: created.updated_at,
            },
            ...prev,
          ]);
        }
      } catch {
        // fallback to stateless chat
      }
    }

    pushMessage('user', body);
    setSmartReplies([]);
    setRecommendations([]);
    setText('');
    setLoading(true);

    try {
      const response = await api.post('/assistant/chat/', {
        message: body,
        session_id: sessionId,
        context,
      });

      const payload = response.data || {};
      const effectiveSessionId = payload.session_id || sessionId || null;

      if (effectiveSessionId && effectiveSessionId !== activeSessionId) {
        setActiveSessionId(effectiveSessionId);
      }

      pushMessage('assistant', payload.reply || 'I could not generate a reply this time.', payload.data || null);

      const nextReplies = getSmartRepliesForMessage(body);
      const nextRecommendations = getRecommendationsForMessage(body);
      setSmartReplies(nextReplies);
      setRecommendations(nextRecommendations);

      if (payload.context) {
        setContext((prev) => ({ ...prev, ...payload.context }));
      }

      if (effectiveSessionId) {
        setSessions((prev) => {
          const existing = prev.find((item) => item.id === effectiveSessionId);
          const preview = payload.reply || body;

          if (!existing) {
            return [
              {
                id: effectiveSessionId,
                title: body.slice(0, 70) || 'New Chat',
                last_message_preview: preview,
                last_message_at: new Date().toISOString(),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
              ...prev,
            ];
          }

          return [
            {
              ...existing,
              title: existing.title === 'New Chat' ? body.slice(0, 70) || existing.title : existing.title,
              last_message_preview: preview,
              last_message_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            ...prev.filter((item) => item.id !== effectiveSessionId),
          ];
        });
      }
    } catch (error) {
      pushMessage(
        'assistant',
        error.response?.data?.detail || 'Assistant is unavailable right now. Please try again shortly.'
      );
    } finally {
      setLoading(false);
    }
  };

  const sendImageMessage = async (messageText = '') => {
    if (!uploadedImage || imageAnalyzing || loading) return;

    let sessionId = activeSessionId;
    const caption = (messageText || text || '').trim();
    const imageDataUrl = previewUrl;

    if (!sessionId) {
      try {
        const response = await api.post('/assistant/sessions/', { title: caption.slice(0, 70) || 'Image Detection Chat' });
        const created = response.data;
        sessionId = created?.id;
        if (sessionId) {
          setActiveSessionId(sessionId);
          setSessions((prev) => [
            {
              id: sessionId,
              title: created.title || caption.slice(0, 70) || 'Image Detection Chat',
              last_message_preview: '',
              last_message_at: created.last_message_at,
              created_at: created.created_at,
              updated_at: created.updated_at,
            },
            ...prev,
          ]);
        }
      } catch {
        // fallback: continue without session
      }
    }

    const userImageText = caption || '📷 Image uploaded';
    pushMessage('user', userImageText, {
      message_type: 'image',
      caption,
      image_preview_url: imageDataUrl,
    }, {
      type: 'image',
      imageUrl: imageDataUrl,
      caption,
    });

    setText('');
    setSmartReplies([]);
    setRecommendations([]);
    setImageAnalyzing(true);

    try {
      const formData = new FormData();
      formData.append('image', uploadedImage);
      if (caption) formData.append('message', caption);
      if (sessionId) formData.append('session_id', String(sessionId));

      const response = await api.post('/detect-image/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const payload = response.data || {};
      const effectiveSessionId = payload.session_id || sessionId || null;
      if (effectiveSessionId && effectiveSessionId !== activeSessionId) {
        setActiveSessionId(effectiveSessionId);
      }

      if (effectiveSessionId) {
        setSessions((prev) => {
          const existing = prev.find((item) => item.id === effectiveSessionId);
          const preview = payload.reply || userImageText;

          if (!existing) {
            return [
              {
                id: effectiveSessionId,
                title: userImageText.slice(0, 70) || 'Image Detection Chat',
                last_message_preview: preview,
                last_message_at: new Date().toISOString(),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
              ...prev,
            ];
          }

          return [
            {
              ...existing,
              last_message_preview: preview,
              last_message_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            ...prev.filter((item) => item.id !== effectiveSessionId),
          ];
        });
      }

      setImageApiResponse(payload);

      pushMessage(
        'assistant',
        payload.reply || 'Image analyzed successfully.',
        {
          ...(payload.data || {}),
          source: payload.source || 'gemini',
        }
      );

      const smartFromImage = getSmartRepliesForMessage(
        `${payload?.data?.problem_type || ''} ${payload?.data?.suggested_service || ''} ${caption}`
      );
      const recFromImage = getRecommendationsFromDetection(payload?.data || {});
      setSmartReplies(smartFromImage);
      setRecommendations(recFromImage);
    } catch (error) {
      pushMessage(
        'assistant',
        error.response?.data?.detail || 'Image analysis failed. Please try again.',
        { source: 'gemini' }
      );
    } finally {
      clearSelectedImage();
      setImageAnalyzing(false);
    }
  };

  const handleSendAction = () => {
    if (uploadedImage) {
      sendImageMessage();
      return;
    }
    sendMessage();
  };

  useEffect(() => {
    sendMessageRef.current = sendMessage;
  }, [sendMessage]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechSupported(false);
      setVoiceHint('Voice input is not supported in this browser.');
      return undefined;
    }

    setSpeechSupported(true);
    setVoiceHint('');
    const recognition = new SpeechRecognition();
    recognition.lang = voiceLanguage;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setVoiceHint(voiceLanguage === 'bn-BD' ? 'শুনছি... এখন কথা বলুন' : 'Listening... speak now');
    };
    recognition.onend = () => {
      setIsListening(false);
      setVoiceHint((prev) => (
        prev === 'Listening... speak now' || prev === 'শুনছি... এখন কথা বলুন' ? '' : prev
      ));
    };
    recognition.onerror = (event) => {
      setIsListening(false);
      const errorType = event?.error;
      if (errorType === 'no-speech') {
        setVoiceHint(voiceLanguage === 'bn-BD' ? 'কোনো শব্দ ধরা যায়নি, আবার চেষ্টা করুন।' : 'No speech detected. Please try again.');
        return;
      }
      if (errorType === 'not-allowed' || errorType === 'service-not-allowed') {
        setVoiceHint(
          voiceLanguage === 'bn-BD'
            ? 'মাইক্রোফোন পারমিশন বন্ধ আছে। Allow করে আবার চেষ্টা করুন।'
            : 'Microphone access denied. Please allow mic permission and retry.'
        );
        return;
      }
      setVoiceHint(voiceLanguage === 'bn-BD' ? 'ভয়েস ইনপুট ব্যর্থ হয়েছে, আবার চেষ্টা করুন।' : 'Voice input failed. Please try again.');
    };
    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const chunk = event.results[i]?.[0]?.transcript || '';
        if (event.results[i].isFinal) {
          finalTranscript += chunk;
        } else {
          interimTranscript += chunk;
        }
      }

      const combined = (finalTranscript || interimTranscript).trim();
      if (combined) setText(combined);

      if (finalTranscript.trim()) {
        const spoken = finalTranscript.trim();
        setVoiceHint(voiceLanguage === 'bn-BD' ? 'ভয়েস নেওয়া হয়েছে, পাঠানো হচ্ছে...' : 'Voice captured. Sending...');
        sendMessageRef.current?.(spoken);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.abort();
      recognitionRef.current = null;
    };
  }, [voiceLanguage]);

  const toggleVoiceInput = async () => {
    if (!speechSupported || loading || !recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.lang = voiceLanguage;
        recognitionRef.current.start();
      } catch (error) {
        setIsListening(false);
        setVoiceHint(voiceLanguage === 'bn-BD' ? 'মাইক চালু করা যায়নি, আবার চেষ্টা করুন।' : 'Could not start microphone. Please retry.');
        await showAlert('Microphone start kora jacche na. Browser permission allow kore abar try korun. Language BN/EN switch koreo try korte paren.', {
          title: 'Voice input error',
        });
      }
    }
  };

  const onSmartReplySelect = (reply) => {
    if (!reply) return;
    sendMessage(reply);
  };

  const onRecommendationBook = (recommendation) => {
    const prompt = recommendation?.bookPrompt || `Ami ${recommendation?.serviceType || 'service'} book korte chai`;
    sendMessage(prompt);
  };

  const startAssistantPayment = async (orderId, messageData = null) => {
    if (!orderId || paymentStartingOrderId) return;

    const sessionId = activeSessionId || messageData?.session_id || null;

    setPaymentStartingOrderId(orderId);
    try {
      const response = await api.post(`/orders/${orderId}/pay/`, {
        phone: context.booking_phone || '01700000000',
        address: context.location || 'Dhaka',
        city: 'Dhaka',
        source: 'assistant',
        assistant_session_id: sessionId,
      });

      if (response.data?.status === 'success' && response.data?.gateway_url) {
        window.location.href = response.data.gateway_url;
        return;
      }

      pushMessage('assistant', 'Payment gateway start korte pari ni. Please abar try korun.');
    } catch (error) {
      pushMessage(
        'assistant',
        error.response?.data?.detail || 'Payment start korte problem hocche. Ektu pore abar try korun.'
      );
    } finally {
      setPaymentStartingOrderId(null);
    }
  };

  useEffect(() => {
    const paymentStatus = (searchParams.get('payment') || '').toLowerCase();
    const orderIdParam = searchParams.get('order_id');
    const sessionIdParam = searchParams.get('session_id');

    if (!paymentStatus) return;

    const run = async () => {
      const sessionId = sessionIdParam ? Number(sessionIdParam) : null;

      if (sessionId) {
        await openSession(sessionId);
      }

      if (paymentStatus === 'success' && orderIdParam) {
        try {
          const response = await api.post('/assistant/chat/', {
            message: `I have completed payment for order #${orderIdParam}.`,
            session_id: sessionId || activeSessionId,
            context: {
              ...context,
              order_id: Number(orderIdParam),
            },
          });

          const payload = response.data || {};
          if (payload.session_id) {
            setActiveSessionId(payload.session_id);
          }
          pushMessage(
            'assistant',
            payload.reply || `✅ Your payment is successful for Order #${orderIdParam}.`,
            payload.data || null
          );
          if (payload.context) {
            setContext((prev) => ({ ...prev, ...payload.context }));
          }
        } catch {
          pushMessage('assistant', `✅ Your payment is successful for Order #${orderIdParam}.`);
        }
      } else if (paymentStatus === 'fail' && orderIdParam) {
        pushMessage('assistant', `Payment failed for Order #${orderIdParam}. Chaile ami abar payment process e help korte pari.`);
      } else if (paymentStatus === 'cancel' && orderIdParam) {
        pushMessage('assistant', `Payment cancelled for Order #${orderIdParam}. Chaile 'pay now' diye abar continue korte paren.`);
      }

      navigate('/ai-assistant', { replace: true });
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(20,184,166,0.18),_transparent_34%),linear-gradient(135deg,#f8fafc_0%,#ecfeff_48%,#ffffff_100%)] px-4 py-10">
      <div className="mx-auto mb-4 flex max-w-7xl justify-end">
        <button
          type="button"
          onClick={() => {
            sessionStorage.setItem('chatbot_open_popup', '1');
            navigate(-1);
          }}
          className="group relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-teal-300/70 bg-white/90 text-teal-700 shadow-[0_10px_30px_-14px_rgba(20,184,166,0.65)] backdrop-blur transition-all duration-300 hover:-translate-y-0.5 hover:scale-110 hover:border-teal-400 hover:bg-teal-50 hover:text-teal-800"
          title="Back to popup chat"
          aria-label="Back to popup chat"
        >
          <span className="absolute inset-0 rounded-full border border-teal-300/40 group-hover:animate-ping" />
          <ArrowsPointingInIcon className="relative z-10 h-5 w-5" />
        </button>
      </div>

      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="rounded-[28px] border border-white/10 bg-slate-900/90 p-6 text-white shadow-2xl backdrop-blur">
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-400/30 bg-teal-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-teal-200">
            <SparklesIcon className="h-4 w-4" />
            AI Assistant
          </div>
          <h1 className="mt-4 text-3xl font-bold leading-tight">HomeCrew Chatbot</h1>
          <p className="mt-3 text-sm text-slate-300">
            History stays saved. Open any previous chat from sidebar and continue with full memory.
          </p>

          <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">Chat History</p>
              <button
                type="button"
                onClick={createNewSession}
                className="inline-flex items-center gap-1 rounded-full border border-white/20 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-200 transition hover:border-teal-300 hover:text-teal-200"
              >
                <PlusIcon className="h-3.5 w-3.5" /> New
              </button>
            </div>

            <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
              {sessionsLoading && <p className="text-xs text-slate-300">Loading history...</p>}
              {!sessionsLoading && sessions.length === 0 && (
                <p className="text-xs text-slate-400">No saved chats yet. Start a new conversation.</p>
              )}
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className={`rounded-xl border px-3 py-2 transition ${
                    activeSessionId === session.id
                      ? 'border-teal-300 bg-teal-400/10'
                      : 'border-white/10 bg-slate-950/40 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => openSession(session.id)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <p className="truncate text-xs font-semibold text-white">{session.title || 'New Chat'}</p>
                      <p className="mt-1 truncate text-[11px] text-slate-300">{session.last_message_preview || 'No messages yet'}</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSession(session.id, session.title || 'New Chat')}
                      className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/20 text-slate-300 transition hover:border-rose-300 hover:text-rose-300"
                      aria-label={`Delete ${session.title || 'chat session'}`}
                      title="Delete chat"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4">
            <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">Service</label>
            <select
              value={context.service_id || ''}
              onChange={(event) =>
                setContext((prev) => ({
                  ...prev,
                  service_id: event.target.value ? Number(event.target.value) : null,
                }))
              }
              className="w-full rounded-xl border border-white/20 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none"
            >
              <option value="">Select service</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
            </select>

            <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
              <CalendarDaysIcon className="mr-1 inline h-4 w-4" /> Preferred Date
            </label>
            <input
              type="date"
              value={context.booking_date || ''}
              onChange={(event) => setContext((prev) => ({ ...prev, booking_date: event.target.value }))}
              className="w-full rounded-xl border border-white/20 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none"
            />

            <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
              <MapPinIcon className="mr-1 inline h-4 w-4" /> Location
            </label>
            <input
              type="text"
              value={context.location || ''}
              onChange={(event) => setContext((prev) => ({ ...prev, location: event.target.value }))}
              placeholder="e.g. Mirpur, Dhaka"
              className="w-full rounded-xl border border-white/20 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none"
            />

            <label className="flex items-center gap-2 text-sm text-slate-200">
              <input
                type="checkbox"
                checked={!!context.confirm_booking}
                onChange={(event) =>
                  setContext((prev) => ({
                    ...prev,
                    confirm_booking: event.target.checked,
                  }))
                }
                className="h-4 w-4 rounded border-white/30 bg-slate-950"
              />
              Confirm booking in this request
            </label>
          </div>

          <button
            type="button"
            onClick={() => {
              setContext(DEFAULT_CONTEXT);
              setServiceVisibleCounts({});
              setMessages([
                {
                  role: 'assistant',
                  text: 'Context reset done. Tell me what service help you need.',
                  data: null,
                },
              ]);
            }}
            className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-200 transition hover:border-teal-300 hover:text-teal-200"
          >
            <ArrowPathIcon className="h-4 w-4" /> Reset Session
          </button>
        </aside>

        <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_30px_100px_rgba(15,23,42,0.18)]">
          <div className="border-b border-slate-200 bg-slate-50 px-6 py-5 sm:px-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-600">AI Chat Flow</p>
                <h2 className="mt-2 text-2xl font-bold text-slate-900">{activeSession?.title || 'New Chat'}</h2>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-200">
                <ChatBubbleLeftRightIcon className="h-4 w-4" />
                {activeSessionId ? `Session #${activeSessionId}` : 'Unsaved Session'}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => sendMessage(prompt)}
                  disabled={loading}
                  className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-teal-300 hover:text-teal-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          <div className="h-[620px] overflow-y-auto bg-[linear-gradient(135deg,#ffffff_0%,#f8fafc_65%,#ecfeff_100%)] px-6 py-6 sm:px-8">
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div key={`${message.role}-${index}`} className={`flex ${message.role === 'assistant' ? 'justify-start' : 'justify-end'}`}>
                  <div
                    className={`max-w-2xl rounded-[24px] px-5 py-4 text-sm leading-7 shadow-sm ${
                      message.role === 'assistant' ? 'bg-slate-900 text-white' : 'bg-teal-600 text-white'
                    }`}
                  >
                    <p>{message.text}</p>
                    {(message.type === 'image' || message.data?.message_type === 'image') && (message.imageUrl || message.data?.image_preview_url) && (
                      <div className="mt-3 rounded-xl overflow-hidden border border-white/20 bg-black/10">
                        <img src={message.imageUrl || message.data?.image_preview_url} alt="Uploaded issue" className="max-h-60 w-full object-contain bg-black/10" />
                        {(message.caption || message.data?.caption) ? <p className="px-3 py-2 text-xs text-white/90">{message.caption || message.data?.caption}</p> : null}
                      </div>
                    )}
                    {message.data?.services?.length > 0 && (
                      <div className="mt-3 rounded-xl bg-white/10 p-3 text-xs">
                        {(() => {
                          const messageKey = `${message.role}-${index}`;
                          const totalCount = message.data.services.length;
                          const visibleCount = Math.min(serviceVisibleCounts[messageKey] || 10, totalCount);
                          const visibleServices = message.data.services.slice(0, visibleCount);

                          return (
                            <>
                              {visibleServices.map((service) => (
                                <p key={service.id} className="mb-1 last:mb-0">
                                  {service.name} - BDT {Number(service.price).toFixed(2)}
                                </p>
                              ))}
                              {visibleCount < totalCount && (
                                <button
                                  type="button"
                                  onClick={() => increaseVisibleServices(messageKey, totalCount)}
                                  className="mt-2 inline-flex rounded-full border border-white/30 px-2.5 py-1 text-[11px] font-semibold text-white transition hover:border-teal-200 hover:text-teal-100"
                                >
                                  See more
                                </button>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    )}
                    {message.data?.order && (
                      <div className="mt-3 rounded-xl bg-white/10 p-3 text-xs">
                        <p>Order #{message.data.order.id}</p>
                        <p>{message.data.order.status_text}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          {message.data.order.status === 'NOT_PAID' && (
                            <button
                              type="button"
                              onClick={() => startAssistantPayment(message.data.order.id, message.data)}
                              disabled={paymentStartingOrderId === message.data.order.id}
                              className="inline-flex items-center rounded-full border border-emerald-300/60 bg-emerald-500/20 px-3 py-1 text-[11px] font-semibold text-emerald-100 transition hover:border-emerald-200 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {paymentStartingOrderId === message.data.order.id ? 'Starting payment...' : 'Pay Now'}
                            </button>
                          )}
                          <Link
                            to={`/orders/${message.data.order.id}`}
                            className="inline-flex items-center rounded-full border border-white/30 px-3 py-1 text-[11px] font-semibold text-white transition hover:border-teal-300 hover:text-teal-200"
                          >
                            Go to Order
                          </Link>
                        </div>
                      </div>
                    )}
                    {message.data?.slots?.length > 0 && (
                      <div className="mt-3 rounded-xl bg-white/10 p-3 text-xs">
                        <p>Available slots: {message.data.slots.join(', ')}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="rounded-[24px] bg-slate-900 px-5 py-3 text-sm text-slate-200">Typing...</div>
                </div>
              )}
              {imageAnalyzing && (
                <div className="flex justify-start">
                  <div className="rounded-[24px] bg-slate-900 px-5 py-3 text-sm text-slate-200">Analyzing image...</div>
                </div>
              )}

              {!loading && smartReplies.length > 0 && (
                <div className="flex justify-start">
                  <div className="max-w-2xl w-full">
                    <SmartReplyList replies={smartReplies} onSelect={onSmartReplySelect} />
                  </div>
                </div>
              )}

              {!loading && recommendations.length > 0 && (
                <div className="flex justify-start">
                  <div className="max-w-3xl w-full rounded-2xl border border-cyan-100 bg-cyan-50/40 p-3 backdrop-blur transition-all duration-300 animate-[fadeIn_0.25s_ease]">
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-700">Recommended For You</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {recommendations.map((recommendation) => (
                        <RecommendationCard
                          key={recommendation.id}
                          recommendation={recommendation}
                          onBookNow={onRecommendationBook}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-slate-200 bg-white px-6 py-4 sm:px-8">
            <div className="flex items-end gap-3 rounded-[26px] border border-slate-200 bg-slate-50 p-3">
              <textarea
                rows={3}
                value={text}
                onChange={(event) => setText(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    handleSendAction();
                  }
                }}
                placeholder="Type your question. Example: Fan problem, ki service lagbe?"
                className="w-full resize-none border-none bg-transparent px-2 py-2 text-sm text-slate-700 outline-none placeholder:text-slate-400"
              />
              <button
                type="button"
                onClick={handleSendAction}
                disabled={!canSend}
                className="inline-flex items-center gap-2 rounded-full bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <PaperAirplaneIcon className="h-4 w-4" /> {uploadedImage ? 'Send Image' : 'Send'}
              </button>
              <VoiceButton
                isListening={isListening}
                isSupported={speechSupported}
                onToggle={toggleVoiceInput}
                disabled={loading || imageAnalyzing}
              />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 px-2">
              <ImageUploadButton onSelect={handleImageSelect} disabled={loading || imageAnalyzing} />
              <CameraCaptureButton onSelect={handleImageSelect} disabled={loading || imageAnalyzing} />
              {imageApiResponse?.source ? (
                <span className="text-[11px] font-semibold text-slate-500">Image AI source: {imageApiResponse.source}</span>
              ) : null}
            </div>
            <ImagePreview
              previewUrl={previewUrl}
              fileName={uploadedImage?.name}
              onRemove={clearSelectedImage}
            />
            {speechSupported && (
              <div className="mt-2 px-2 flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Voice language</span>
                <button
                  type="button"
                  onClick={() => setVoiceLanguage('bn-BD')}
                  disabled={isListening}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition ${voiceLanguage === 'bn-BD' ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'} disabled:opacity-60`}
                >
                  বাংলা
                </button>
                <button
                  type="button"
                  onClick={() => setVoiceLanguage('en-US')}
                  disabled={isListening}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition ${voiceLanguage === 'en-US' ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'} disabled:opacity-60`}
                >
                  English
                </button>
              </div>
            )}
            {!!voiceHint && (
              <p className="mt-2 px-2 text-xs font-medium text-slate-500">{voiceHint}</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Assistant;
