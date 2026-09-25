import React, { useState, useEffect, useRef } from 'react';
import { 
  CommunityNeed, 
  ResourceListing, 
  NeedsDraft, 
  AssistantChatMessage,
  Category 
} from '../types/resource';
import { NEIGHBORHOODS, getNeighborhoodById } from '../data/neighborhoods';
import { 
  MessageSquare, 
  X, 
  Send, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  MapPin, 
  ExternalLink, 
  RotateCcw, 
  ChevronDown, 
  ChevronUp,
  ShieldCheck,
  Package,
  Layers,
  HeartHandshake,
  Edit3,
  Mic,
  MicOff,
  Square,
  Volume2
} from 'lucide-react';

interface NeedsChatWidgetProps {
  selectedNeighborhood: string;
  onNeighborhoodChange: (id: string) => void;
  onNeedCreated: (newNeed: CommunityNeed) => void;
  onClaimItem?: (listing: ResourceListing) => void;
  onViewNeedsBoard?: () => void;
}

const INITIAL_SUGGESTIONS = [
  '🚨 We urgently need 10 warm blankets for tonight',
  '🍼 Our pantry ran out of infant formula & diapers',
  '🍞 Need fresh groceries & canned goods for seniors',
  '🧼 15 hygiene & dental kits for outreach team'
];

export const NeedsChatWidget: React.FC<NeedsChatWidgetProps> = ({
  selectedNeighborhood,
  onNeighborhoodChange,
  onNeedCreated,
  onClaimItem,
  onViewNeedsBoard
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(true);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [submittingNeedId, setSubmittingNeedId] = useState<string | null>(null);
  const [postedNeedIds, setPostedNeedIds] = useState<Set<string>>(new Set());

  // Voice Input States
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [voiceInterimText, setVoiceInterimText] = useState('');
  const [voiceError, setVoiceError] = useState<string | null>(null);

  // References for voice recognition & audio recording
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const accumulatedVoiceTranscriptRef = useRef<string>('');
  const silenceTimerRef = useRef<any>(null);
  const isCancelledRef = useRef<boolean>(false);
  const hasAutoSubmittedRef = useRef<boolean>(false);
  const handleSendMessageRef = useRef<(textToSend?: string) => Promise<void>>(null as any);

  // Editing state for customizing detected need before posting
  const [editingDraftIndex, setEditingDraftIndex] = useState<number | null>(null);
  const [editedDraft, setEditedDraft] = useState<NeedsDraft | null>(null);

  const [messages, setMessages] = useState<AssistantChatMessage[]>([
    {
      id: 'welcome-msg',
      role: 'assistant',
      content: `Hello neighbor! 👋 I'm KindShare's Community Care Assistant. If your community, pantry, shelter, or family is facing an acute shortage, tell me below in your own words (or tap the 🎙️ mic to speak). I'll formulate it into a Critical Community Need you can broadcast to local donors with 1 tap.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      suggestedFollowUps: INITIAL_SUGGESTIONS
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setShowTooltip(false);
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, messages, isLoading]);

  // Clean up audio streams and timers on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try { mediaRecorderRef.current.stop(); } catch {}
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  // Voice recording timer
  useEffect(() => {
    if (isRecording) {
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordingSeconds(s => s + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  // Stop and automatically submit the voice message
  const stopVoiceInputAndSubmit = (directText?: string) => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }

    setIsRecording(false);

    const textToSubmit = (directText || accumulatedVoiceTranscriptRef.current || inputMessage).trim();
    if (textToSubmit && !hasAutoSubmittedRef.current && !isCancelledRef.current) {
      hasAutoSubmittedRef.current = true;
      setVoiceInterimText('');
      setInputMessage('');
      accumulatedVoiceTranscriptRef.current = '';
      if (handleSendMessageRef.current) {
        handleSendMessageRef.current(textToSubmit);
      }
    }
  };

  // Start MediaRecorder fallback (Gemini 3.5 Transcribe) with automatic submission
  const startMediaRecorderVoice = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      audioChunksRef.current = [];
      isCancelledRef.current = false;
      hasAutoSubmittedRef.current = false;
      accumulatedVoiceTranscriptRef.current = '';

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        setIsRecording(false);

        if (isCancelledRef.current) {
          setIsTranscribing(false);
          return;
        }

        setIsTranscribing(true);

        try {
          const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType || 'audio/webm' });
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            if (isCancelledRef.current) {
              setIsTranscribing(false);
              return;
            }

            const base64Data = reader.result as string;
            const res = await fetch('/api/transcribe-audio', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                audioBase64: base64Data,
                mimeType: mediaRecorder.mimeType || 'audio/webm'
              })
            });

            setIsTranscribing(false);

            if (res.ok) {
              const data = await res.json();
              if (data.transcript && data.transcript.trim() && !isCancelledRef.current && !hasAutoSubmittedRef.current) {
                const finalSpoken = data.transcript.trim();
                hasAutoSubmittedRef.current = true;
                setInputMessage('');
                setVoiceInterimText('');
                // Automatically submit once recording finishes!
                if (handleSendMessageRef.current) {
                  handleSendMessageRef.current(finalSpoken);
                }
                return;
              }
            } else {
              setVoiceError('Could not transcribe audio. Please type your request.');
            }
          };
        } catch (e: any) {
          console.error('Audio processing error:', e);
          setIsTranscribing(false);
          setVoiceError('Error processing speech.');
        }
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setVoiceError(null);
    } catch (err: any) {
      console.error('Microphone access denied or error:', err);
      setIsRecording(false);
      setVoiceError('Microphone permission required for voice input.');
      setTimeout(() => setVoiceError(null), 4000);
    }
  };

  // Toggle Voice Input
  const handleToggleVoiceInput = () => {
    if (isRecording) {
      stopVoiceInputAndSubmit();
      return;
    }

    setVoiceError(null);
    setVoiceInterimText('');
    isCancelledRef.current = false;
    hasAutoSubmittedRef.current = false;
    accumulatedVoiceTranscriptRef.current = '';

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognitionRef.current = recognition;
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
          setIsRecording(true);
        };

        recognition.onresult = (event: any) => {
          if (isCancelledRef.current) return;
          let currentInterim = '';
          let currentFinal = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              currentFinal += event.results[i][0].transcript;
            } else {
              currentInterim += event.results[i][0].transcript;
            }
          }

          const latestSpoken = (currentFinal || currentInterim || '').trim();
          if (latestSpoken) {
            accumulatedVoiceTranscriptRef.current = latestSpoken;
            setVoiceInterimText(latestSpoken);
            setInputMessage(latestSpoken);

            // Silence detection: automatically stop recording & submit after 1.6s of silence
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = setTimeout(() => {
              if (accumulatedVoiceTranscriptRef.current.trim().length > 2 && !hasAutoSubmittedRef.current) {
                stopVoiceInputAndSubmit();
              }
            }, 1600);
          }
        };

        recognition.onerror = (event: any) => {
          console.warn('SpeechRecognition error:', event.error);
          if (event.error === 'not-allowed') {
            setVoiceError('Microphone permission denied.');
            setIsRecording(false);
          } else if (event.error === 'no-speech') {
            // No speech detected yet, keep waiting
          } else {
            // Fallback to MediaRecorder + Gemini Transcribe
            try { recognition.stop(); } catch {}
            startMediaRecorderVoice();
          }
        };

        recognition.onend = () => {
          setIsRecording(false);
          // If speech was recorded and not yet submitted, auto-submit on completion
          if (!hasAutoSubmittedRef.current && !isCancelledRef.current) {
            const text = (accumulatedVoiceTranscriptRef.current || inputMessage).trim();
            if (text) {
              hasAutoSubmittedRef.current = true;
              setVoiceInterimText('');
              setInputMessage('');
              accumulatedVoiceTranscriptRef.current = '';
              if (handleSendMessageRef.current) {
                handleSendMessageRef.current(text);
              }
            }
          }
        };

        recognition.start();
      } catch (err) {
        console.warn('Error starting SpeechRecognition, falling back to MediaRecorder:', err);
        startMediaRecorderVoice();
      }
    } else {
      // Browser doesn't support SpeechRecognition, use MediaRecorder + Gemini Transcribe
      startMediaRecorderVoice();
    }
  };

  const cancelVoiceInput = () => {
    isCancelledRef.current = true;
    hasAutoSubmittedRef.current = true; // prevent late triggers
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
    setIsRecording(false);
    setIsTranscribing(false);
    setVoiceInterimText('');
    accumulatedVoiceTranscriptRef.current = '';
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isLoading) return;

    const userMessage: AssistantChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Build conversation payload for the server
      const payloadMessages = newMessages
        .filter(m => m.id !== 'welcome-msg')
        .map(m => ({
          role: m.role,
          content: m.content
        }));

      const res = await fetch('/api/chat/needs-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: payloadMessages,
          neighborhoodId: selectedNeighborhood === 'all' ? 'mission' : selectedNeighborhood
        })
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const data = await res.json();

      const assistantReply: AssistantChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: data.replyText || "I've reviewed your request. You can see the details below.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        hasDetectedNeed: data.hasDetectedNeed,
        detectedNeed: data.detectedNeed,
        suggestedFollowUps: data.suggestedFollowUps || [],
        matchingListings: data.matchingListings || []
      };

      setMessages(prev => [...prev, assistantReply]);
    } catch (err: any) {
      console.error('Failed to chat with needs assistant:', err);
      // Fallback assistant response
      const fallbackReply: AssistantChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: "I hear the need you're describing. I've structured an urgent community request based on your message below so you can broadcast it directly to donors.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        hasDetectedNeed: true,
        detectedNeed: {
          title: text.slice(0, 40),
          category: 'Household',
          quantityRequested: 'Immediate community request',
          urgency: 'critical',
          neighborhoodId: selectedNeighborhood === 'all' ? 'mission' : selectedNeighborhood,
          neighborhoodName: getNeighborhoodById(selectedNeighborhood === 'all' ? 'mission' : selectedNeighborhood).name,
          requesterType: 'Neighbor',
          reason: text
        },
        suggestedFollowUps: ['Can we adjust the quantity?', 'Change neighborhood to SOMA']
      };
      setMessages(prev => [...prev, fallbackReply]);
    } finally {
      setIsLoading(false);
    }
  };

  handleSendMessageRef.current = handleSendMessage;

  const handlePostNeed = async (draft: NeedsDraft, msgId: string) => {
    setSubmittingNeedId(msgId);
    try {
      const res = await fetch('/api/needs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: draft.title,
          category: draft.category,
          quantityRequested: draft.quantityRequested,
          urgency: draft.urgency,
          neighborhoodId: draft.neighborhoodId,
          requesterType: draft.requesterType,
          reason: draft.reason
        })
      });

      if (!res.ok) {
        throw new Error('Failed to post need to server');
      }

      const created: CommunityNeed = await res.json();
      onNeedCreated(created);

      setPostedNeedIds(prev => new Set(prev).add(msgId));

      // Append confirmation from assistant
      setMessages(prev => [
        ...prev,
        {
          id: `sys-confirm-${Date.now()}`,
          role: 'assistant',
          content: `🎉 Need "${created.title}" has been broadcast to the Urgent Community Wishlist in ${created.neighborhoodName}! Local donors have been notified.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          postedNeedId: created.id,
          suggestedFollowUps: ['Post another urgent need', 'What else is urgently needed?']
        }
      ]);
    } catch (err: any) {
      console.error('Error posting need:', err);
      alert('Unable to publish need at this moment. Please try again.');
    } finally {
      setSubmittingNeedId(null);
    }
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: 'welcome-msg',
        role: 'assistant',
        content: `Hello neighbor! 👋 I'm KindShare's Community Care Assistant. If your community, pantry, shelter, or family is facing an acute shortage, tell me below in your own words. I'll formulate it into a Critical Community Need you can broadcast to local donors with 1 tap.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedFollowUps: INITIAL_SUGGESTIONS
      }
    ]);
  };

  const currentNeighborhoodObj = getNeighborhoodById(
    selectedNeighborhood === 'all' ? 'mission' : selectedNeighborhood
  );

  return (
    <div className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-40 select-none">
      
      {/* Floating Prompt Tooltip (when closed) */}
      {!isOpen && showTooltip && (
        <div className="absolute bottom-16 right-0 mb-2 w-72 bg-slate-900 text-white p-3.5 rounded-2xl shadow-2xl border border-slate-700/80 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-1.5 text-rose-400 font-bold text-xs">
              <AlertCircle className="w-3.5 h-3.5 animate-pulse" />
              <span>Need Urgent Supplies?</span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowTooltip(false);
              }}
              className="text-slate-400 hover:text-white p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-[11px] text-slate-300 mt-1 leading-snug">
            Chat with our AI intake bot to broadcast acute community needs (food, diapers, blankets) directly to local donors!
          </p>
          <button
            onClick={() => setIsOpen(true)}
            className="mt-2 text-[11px] font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 underline underline-offset-2"
          >
            Start Chat & Post Need &rarr;
          </button>
        </div>
      )}

      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center gap-2.5 px-4 py-3 sm:px-5 sm:py-3.5 rounded-full bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 text-white shadow-xl hover:shadow-2xl border border-rose-400/30 hover:border-rose-400/60 transition-all duration-200 transform hover:scale-[1.03] active:scale-95 cursor-pointer"
        >
          <div className="relative flex items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-400 group-hover:bg-rose-500 group-hover:text-white transition-colors">
              <MessageSquare className="w-4 h-4" />
            </div>
            {/* Pulsing indicator */}
            <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
            </span>
          </div>

          <div className="text-left hidden sm:block">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black tracking-wide text-white">Need Help? Chat AI</span>
              <Sparkles className="w-3 h-3 text-amber-400" />
            </div>
            <p className="text-[10px] text-rose-200/80 font-medium">Post Critical Needs Instantly</p>
          </div>

          <span className="sm:hidden text-xs font-black text-white">Chat & Need AI</span>
        </button>
      )}

      {/* Expanded Chat Window */}
      {isOpen && (
        <div className="w-[390px] sm:w-[430px] max-w-[calc(100vw-1.5rem)] h-[600px] max-h-[85vh] bg-white rounded-3xl shadow-2xl border border-slate-200/90 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-rose-950 text-white px-4 py-3.5 flex items-center justify-between border-b border-rose-900/50">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-rose-500 to-amber-500 text-white flex items-center justify-center shadow-md">
                  <HeartHandshake className="w-5 h-5" />
                </div>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-slate-900" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-extrabold text-sm text-white">KindShare Care Assistant</h3>
                  <span className="text-[9px] font-bold uppercase tracking-wider bg-rose-500/30 text-rose-200 px-1.5 py-0.5 rounded-md border border-rose-500/40">
                    Gemini 3.8
                  </span>
                </div>
                <p className="text-[10px] text-slate-300">
                  Chat in natural language • Posts to Urgent Board
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleResetChat}
                title="Restart Conversation"
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Neighborhood Context Pill Strip */}
          <div className="bg-slate-100/90 px-4 py-1.5 border-b border-slate-200/80 flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-1 text-slate-600 font-medium">
              <MapPin className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <span>Target Neighborhood:</span>
            </div>
            <select
              value={selectedNeighborhood === 'all' ? 'mission' : selectedNeighborhood}
              onChange={(e) => onNeighborhoodChange(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-2 py-0.5 text-[11px] font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-500"
            >
              {NEIGHBORHOODS.map(n => (
                <option key={n.id} value={n.id}>{n.name}</option>
              ))}
            </select>
          </div>

          {/* Chat Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/60">
            
            {messages.map((msg, index) => {
              const isUser = msg.role === 'user';
              const isPosted = msg.id && postedNeedIds.has(msg.id);

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                >
                  {/* Speech Bubble */}
                  <div
                    className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed shadow-xs ${
                      isUser
                        ? 'bg-slate-900 text-white rounded-tr-xs'
                        : 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-xs'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    <span className={`block text-[9px] mt-1 ${isUser ? 'text-slate-400 text-right' : 'text-slate-400'}`}>
                      {msg.timestamp}
                    </span>
                  </div>

                  {/* Detected Need Interactive Card */}
                  {msg.hasDetectedNeed && msg.detectedNeed && (
                    <div className="w-full mt-2.5 max-w-[94%] bg-white rounded-2xl p-3.5 border-2 border-rose-300 shadow-md ring-1 ring-rose-100">
                      
                      {/* Card Header */}
                      <div className="flex items-center justify-between gap-1 mb-2 pb-2 border-b border-slate-100">
                        <div className="flex items-center gap-1.5 text-rose-700 font-extrabold text-[11px] uppercase tracking-wider">
                          <AlertCircle className="w-3.5 h-3.5 animate-pulse text-rose-600" />
                          <span>Critical Need Generated</span>
                        </div>
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                          msg.detectedNeed.urgency === 'critical'
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}>
                          {msg.detectedNeed.urgency === 'critical' ? '🚨 Critical' : '⚡ Urgent'}
                        </span>
                      </div>

                      {/* Need Details */}
                      <div className="space-y-1.5 text-xs">
                        <div className="font-extrabold text-slate-900 text-sm">
                          {msg.detectedNeed.title}
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                          <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200">
                            {msg.detectedNeed.category}
                          </span>
                          <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md">
                            Qty: {msg.detectedNeed.quantityRequested}
                          </span>
                          <span className="text-[10px] font-medium text-slate-500 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            {msg.detectedNeed.neighborhoodName}
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-600 bg-slate-50/80 p-2 rounded-xl border border-slate-100 italic">
                          "{msg.detectedNeed.reason}"
                        </p>

                        <div className="text-[10px] text-slate-500 font-medium">
                          Requester Role: <span className="font-bold text-slate-700">{msg.detectedNeed.requesterType}</span>
                        </div>
                      </div>

                      {/* Action Button: Post as Critical Need */}
                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center gap-2">
                        {isPosted ? (
                          <div className="w-full flex flex-col gap-1.5">
                            <div className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-xs">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              <span>Published to Urgent Wishlist!</span>
                            </div>
                            {onViewNeedsBoard && (
                              <button
                                onClick={onViewNeedsBoard}
                                className="w-full text-center text-[11px] font-bold text-rose-700 hover:text-rose-800 hover:underline flex items-center justify-center gap-1 py-1"
                              >
                                <span>View on Community Needs Board</span>
                                <ExternalLink className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        ) : (
                          <button
                            onClick={() => handlePostNeed(msg.detectedNeed!, msg.id)}
                            disabled={submittingNeedId === msg.id}
                            className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-rose-600 via-rose-700 to-rose-800 hover:from-rose-700 hover:to-rose-900 text-white font-black text-xs shadow-md shadow-rose-600/20 transition-all flex items-center justify-center gap-2 transform active:scale-95 cursor-pointer"
                          >
                            <AlertCircle className="w-3.5 h-3.5 text-rose-200" />
                            <span>
                              {submittingNeedId === msg.id
                                ? 'Broadcasting to Donors...'
                                : '🚨 Post as Critical Need to Board'}
                            </span>
                          </button>
                        )}
                      </div>

                      {/* Matching Listings Already in System */}
                      {msg.matchingListings && msg.matchingListings.length > 0 && (
                        <div className="mt-3 pt-2 border-t border-slate-100 bg-amber-50/60 p-2.5 rounded-xl border border-amber-200/60">
                          <div className="text-[10px] font-bold text-amber-900 flex items-center gap-1 mb-1.5">
                            <Sparkles className="w-3 h-3 text-amber-600" />
                            <span>Surplus items already available nearby:</span>
                          </div>
                          <div className="space-y-1.5">
                            {msg.matchingListings.map(listing => (
                              <div
                                key={listing.id}
                                className="flex items-center justify-between gap-2 bg-white p-2 rounded-lg border border-amber-200 text-xs shadow-xs"
                              >
                                <div className="truncate">
                                  <p className="font-bold text-slate-800 truncate">{listing.title}</p>
                                  <p className="text-[10px] text-slate-500">{listing.neighborhoodName} • {listing.quantity}</p>
                                </div>
                                {onClaimItem && (
                                  <button
                                    onClick={() => onClaimItem(listing)}
                                    className="shrink-0 px-2 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold shadow-xs"
                                  >
                                    Claim
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    </div>
                  )}

                  {/* Suggestion Chips */}
                  {msg.suggestedFollowUps && msg.suggestedFollowUps.length > 0 && index === messages.length - 1 && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5 max-w-[95%]">
                      {msg.suggestedFollowUps.map((suggestion, sIdx) => (
                        <button
                          key={sIdx}
                          onClick={() => handleSendMessage(suggestion)}
                          className="text-[10px] font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1 rounded-full shadow-2xs transition-colors flex items-center gap-1 text-left"
                        >
                          <span>{suggestion}</span>
                        </button>
                      ))}
                    </div>
                  )}

                </div>
              );
            })}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex items-center gap-2 text-slate-500 text-xs bg-white p-3 rounded-2xl border border-slate-200 w-fit shadow-xs animate-pulse">
                <div className="w-4 h-4 rounded-full border-2 border-rose-500 border-t-transparent animate-spin" />
                <span className="text-[11px] font-medium">KindShare AI is organizing your community need...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input Bar with Voice Option */}
          <div className="p-3 bg-white border-t border-slate-200">
            
            {/* Live Voice Recording Status Banner */}
            {isRecording && (
              <div className="mb-2.5 bg-rose-50 border border-rose-200 rounded-2xl p-2.5 flex items-center justify-between text-xs text-rose-900 shadow-xs animate-in fade-in slide-in-from-bottom-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="relative flex h-3 w-3 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-600"></span>
                  </span>
                  <div className="font-mono font-bold text-[11px] text-rose-800 shrink-0">
                    {Math.floor(recordingSeconds / 60)}:{(recordingSeconds % 60).toString().padStart(2, '0')}
                  </div>
                  {/* Waveform animation */}
                  <div className="flex items-center gap-0.5 h-3.5 px-0.5 shrink-0">
                    <div className="w-0.5 h-3 bg-rose-600 animate-pulse rounded-full" />
                    <div className="w-0.5 h-4 bg-rose-500 animate-bounce rounded-full" />
                    <div className="w-0.5 h-2 bg-rose-400 animate-pulse rounded-full" />
                    <div className="w-0.5 h-3.5 bg-rose-600 animate-bounce rounded-full" />
                    <div className="w-0.5 h-2 bg-rose-500 animate-pulse rounded-full" />
                  </div>
                  <span className="text-[11px] font-semibold text-rose-950 truncate">
                    {voiceInterimText || 'Listening... auto-submits when done'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  <button
                    type="button"
                    onClick={() => stopVoiceInputAndSubmit()}
                    className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[10px] font-bold shadow-xs flex items-center gap-1 cursor-pointer"
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Done & Submit</span>
                  </button>
                  <button
                    type="button"
                    onClick={cancelVoiceInput}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                    title="Cancel voice input"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Transcribing Voice Banner */}
            {isTranscribing && (
              <div className="mb-2.5 bg-amber-50 border border-amber-200 rounded-2xl p-2.5 flex items-center gap-2 text-xs text-amber-900 shadow-xs animate-pulse">
                <div className="w-3.5 h-3.5 rounded-full border-2 border-amber-600 border-t-transparent animate-spin shrink-0" />
                <span className="text-[11px] font-medium">Transcribing speech & submitting to AI...</span>
              </div>
            )}

            {/* Voice Error Notice */}
            {voiceError && (
              <div className="mb-2.5 bg-rose-100 border border-rose-200 text-rose-900 text-[11px] px-3 py-1.5 rounded-xl flex items-center justify-between">
                <span>{voiceError}</span>
                <button onClick={() => setVoiceError(null)} className="text-rose-600 hover:text-rose-950 font-bold ml-2">✕</button>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={isRecording ? 'Listening to voice...' : 'Describe what is needed or use mic...'}
                disabled={isLoading}
                className="flex-1 bg-slate-50 border border-slate-300 rounded-2xl px-3.5 py-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent placeholder:text-slate-400"
              />

              {/* Voice Input Microphone Button */}
              <button
                type="button"
                onClick={handleToggleVoiceInput}
                disabled={isLoading || isTranscribing}
                title={isRecording ? 'Finish recording & submit' : 'Voice Input: Speak your need'}
                className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                  isRecording
                    ? 'bg-rose-600 text-white shadow-lg shadow-rose-500/40 ring-4 ring-rose-200 animate-pulse'
                    : 'bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 hover:border-rose-300'
                }`}
              >
                {isRecording ? <Square className="w-4 h-4 fill-white" /> : <Mic className="w-4 h-4" />}
              </button>

              {/* Send Button */}
              <button
                type="submit"
                disabled={!inputMessage.trim() || isLoading || isRecording}
                className="w-10 h-10 rounded-2xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 disabled:opacity-40 text-white flex items-center justify-center shadow-md transition-all shrink-0 cursor-pointer disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
            <div className="flex items-center justify-between text-[10px] text-slate-400 px-1 pt-1.5 font-medium">
              <span>🎙️ Voice dictation & text supported</span>
              <span>Gemini Powered</span>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
