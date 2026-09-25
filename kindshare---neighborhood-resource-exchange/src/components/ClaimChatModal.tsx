import React, { useState, useEffect, useRef } from 'react';
import { 
  ResourceListing, 
  ChatMessage 
} from '../types/resource';
import { 
  X, 
  ShieldCheck, 
  Send, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  Lock, 
  User, 
  Sparkles,
  MessageSquare
} from 'lucide-react';

interface ClaimChatModalProps {
  listing: ResourceListing | null;
  isOpen: boolean;
  onClose: () => void;
  onListingUpdated: (updatedListing: ResourceListing) => void;
}

const QUICK_MESSAGES = [
  'I can meet at the designated safe spot in 20 minutes.',
  'Is this still available for pickup at the community hub?',
  'Heading over now! Thank you so much for sharing.',
  'I have arrived at the public entrance under the lights.'
];

export const ClaimChatModal: React.FC<ClaimChatModalProps> = ({
  listing,
  isOpen,
  onClose,
  onListingUpdated
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [senderRole, setSenderRole] = useState<'receiver' | 'donor'>('receiver');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listing && isOpen) {
      loadMessages();
      // If item was available, trigger reserve
      if (listing.status === 'available') {
        reserveListing();
      }
    }
  }, [listing?.id, isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!isOpen || !listing) return null;

  const reserveListing = async () => {
    try {
      const res = await fetch(`/api/listings/${listing.id}/claim`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.listing) {
          onListingUpdated(data.listing);
        }
      }
    } catch (err) {
      console.error('Error reserving listing:', err);
    }
  };

  const loadMessages = async () => {
    setIsLoadingMessages(true);
    try {
      const res = await fetch(`/api/listings/${listing.id}/messages`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (err) {
      console.error('Error loading messages:', err);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputText;
    if (!text.trim()) return;

    setIsSending(true);
    try {
      const res = await fetch(`/api/listings/${listing.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text.trim(),
          senderType: senderRole,
          senderLabel: senderRole === 'receiver' ? 'Neighbor in Need (Anonymous)' : 'Donor (Anonymous)',
        })
      });

      if (res.ok) {
        const newMsg = await res.json();
        setMessages(prev => [...prev, newMsg]);
        setInputText('');
      }
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleCompletePickup = async () => {
    setIsCompleting(true);
    try {
      const res = await fetch(`/api/listings/${listing.id}/complete`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.listing) {
          onListingUpdated(data.listing);
        }
        // Add completion message
        await handleSendMessage('✅ Pickup confirmed and handoff completed safely! Thank you!');
      }
    } catch (err) {
      console.error('Error completing pickup:', err);
    } finally {
      setIsCompleting(false);
    }
  };

  const isClaimed = listing.status === 'claimed';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-900 to-teal-900 text-white p-4 sm:p-5 flex items-center justify-between border-b border-emerald-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-extrabold text-base sm:text-lg text-white">Safe Anonymous Handoff</h2>
                <span className="text-[10px] font-mono bg-emerald-800 text-emerald-200 px-2 py-0.5 rounded-full border border-emerald-700">
                  Zero PII
                </span>
              </div>
              <p className="text-xs text-emerald-200/80 truncate max-w-xs sm:max-w-md">
                Coordinating: {listing.title} ({listing.quantity})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-emerald-200 hover:text-white hover:bg-emerald-800/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Safe Hub Banner */}
        <div className="bg-emerald-50 p-3.5 border-b border-emerald-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-start gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-bold text-emerald-950 flex items-center gap-2">
                <span>Designated Safe Meetup Spot: {listing.suggestedHub.name}</span>
                <span className="text-[10px] font-mono bg-emerald-200/70 text-emerald-900 px-1.5 py-0.2 rounded font-semibold">
                  {listing.suggestedHub.openHours}
                </span>
              </div>
              <div className="text-[11px] text-emerald-800 mt-0.5">
                {listing.suggestedHub.address} • {listing.neighborhoodName}
              </div>
            </div>
          </div>

          {/* Toggle sender role to easily test both sides of exchange */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-emerald-200 text-[11px] shrink-0 self-end sm:self-auto">
            <span className="text-gray-400 px-1 font-mono">Chatting as:</span>
            <button
              onClick={() => setSenderRole('receiver')}
              className={`px-2 py-0.5 rounded-lg font-bold transition-colors ${
                senderRole === 'receiver' ? 'bg-emerald-600 text-white shadow-xs' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Seeker (You)
            </button>
            <button
              onClick={() => setSenderRole('donor')}
              className={`px-2 py-0.5 rounded-lg font-bold transition-colors ${
                senderRole === 'donor' ? 'bg-emerald-800 text-white shadow-xs' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Donor
            </button>
          </div>
        </div>

        {/* Messages Scroll Area */}
        <div className="p-4 flex-1 overflow-y-auto space-y-3 bg-gray-50/50">
          {isLoadingMessages ? (
            <div className="py-12 text-center text-xs text-gray-400">Loading conversation...</div>
          ) : messages.length === 0 ? (
            <div className="py-8 text-center text-xs text-gray-500">
              No messages yet. Send a quick message below to coordinate meetup!
            </div>
          ) : (
            messages.map((msg) => {
              const isSys = msg.senderType === 'system';
              const isMe = msg.senderType === senderRole;

              if (isSys) {
                return (
                  <div key={msg.id} className="text-center my-2">
                    <div className="inline-flex items-center gap-1.5 bg-slate-100 border border-slate-200 text-slate-700 text-[11px] px-3 py-1.5 rounded-full max-w-md mx-auto leading-relaxed">
                      <Lock className="w-3 h-3 text-slate-500 shrink-0" />
                      <span>{msg.text}</span>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center gap-1 text-[10px] text-gray-500 mb-0.5 px-1 font-medium">
                    <User className="w-2.5 h-2.5" />
                    <span>{msg.senderLabel}</span>
                    <span>•</span>
                    <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div
                    className={`max-w-[82%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed shadow-xs ${
                      isMe
                        ? 'bg-emerald-600 text-white rounded-tr-none'
                        : 'bg-white border border-gray-200 text-gray-900 rounded-tl-none'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Response Buttons */}
        <div className="p-2.5 bg-white border-t border-gray-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider shrink-0 mr-1">
            Quick 1-Tap:
          </span>
          {QUICK_MESSAGES.map((quick, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(quick)}
              className="text-[11px] bg-gray-100 hover:bg-emerald-50 hover:text-emerald-800 hover:border-emerald-200 border border-gray-200 text-gray-700 px-2.5 py-1 rounded-full whitespace-nowrap transition-colors"
            >
              {quick}
            </button>
          ))}
        </div>

        {/* Input Bar & Actions */}
        <div className="p-3 bg-white border-t border-gray-200 flex flex-col gap-2 shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type an anonymous message (no home address or phone needed)..."
              className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
            />
            <button
              type="submit"
              disabled={isSending || !inputText.trim()}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm disabled:opacity-50 transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </button>
          </form>

          {/* Mark Handoff Completed button */}
          <div className="flex items-center justify-between pt-1 text-xs">
            <div className="flex items-center gap-1 text-[11px] text-gray-500">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Zero-stigma public exchange • No paperwork</span>
            </div>

            {!isClaimed ? (
              <button
                type="button"
                onClick={handleCompletePickup}
                disabled={isCompleting}
                className="px-3 py-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold text-xs transition-colors flex items-center gap-1"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                <span>Mark Handoff Completed</span>
              </button>
            ) : (
              <span className="inline-flex items-center gap-1 text-emerald-700 font-bold text-xs bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Exchange Completed</span>
              </span>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
