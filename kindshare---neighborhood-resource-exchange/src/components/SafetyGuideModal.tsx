import React from 'react';
import { 
  ShieldCheck, 
  Lock, 
  EyeOff, 
  MapPin, 
  Building2, 
  X, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';

interface SafetyGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SafetyGuideModal: React.FC<SafetyGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-950 to-teal-950 text-white p-5 flex items-center justify-between border-b border-emerald-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 text-emerald-950 flex items-center justify-center font-bold shadow-md">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-extrabold text-lg text-white">Privacy & Safety Standards</h2>
              <p className="text-xs text-emerald-200/80">
                Architected for donor anonymity and seeker safety
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

        {/* Content */}
        <div className="p-6 space-y-6">
          
          {/* P0: Location Obfuscation */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                Requirement P0
              </span>
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-emerald-600" />
                Zero Home Coordinates Broadcast (H3 Hex Obfuscation)
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              The platform database <strong>never exposes exact GPS lat/long coordinates</strong> to receivers or third parties. All pins on the discovery map are snapped strictly to the centroid of predefined neighborhood boundary hex cells (~0.5-mile perimeter).
            </p>
          </div>

          {/* P1: PII Stripping */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                Requirement P1
              </span>
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                <EyeOff className="w-4 h-4 text-amber-600" />
                AI-Powered PII Stripping & Redaction
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              When photos are processed by Gemini Vision, the prompt strictly scans for and eliminates any Personally Identifiable Information (PII) such as shipping labels on grocery delivery boxes, recipient names, unit numbers, phone numbers, or barcode receipts.
            </p>
          </div>

          {/* Safe Handoff Hubs */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold bg-sky-100 text-sky-800 px-2 py-0.5 rounded-full">
                Public Safety Hubs
              </span>
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-sky-600" />
                Verified Public Meetup Spot Defaults
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Donors and seekers coordinate handoffs at designated public community hubs:
            </p>
            <ul className="text-xs text-slate-600 space-y-1.5 pl-1 pt-1">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span><strong>Public Library Branches:</strong> Staffed civic buildings with exterior lighting and public seating.</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span><strong>Community Fridges & Pantries:</strong> 24/7 sanitary drop-off boxes in active commercial corridors.</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span><strong>Transit Plazas & Civic Centers:</strong> Continuously illuminated stations with high pedestrian visibility.</span>
              </li>
            </ul>
          </div>

          {/* Non-bureaucratic Seeker Dignity */}
          <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-xs text-emerald-950">Zero-Stigma, Zero-Bureaucracy Access</h4>
              <p className="text-xs text-emerald-800/90 mt-0.5 leading-relaxed">
                Individuals facing resource insecurity never need to upload government IDs, undergo means testing, or create burdensome accounts. Essentials are accessible with dignity, immediacy, and respect.
              </p>
            </div>
          </div>

          <div className="text-center pt-2">
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-colors"
            >
              Understood
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
