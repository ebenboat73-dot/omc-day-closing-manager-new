import React from 'react';
import { X, Sparkles } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const OnboardingModal: React.FC<Props> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col">
        <div className="px-6 py-4 bg-slate-800/90 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="p-1.5 rounded-lg bg-amber-500/15 text-amber-400">
              <Sparkles className="w-6 h-6" />
            </span>
            <div>
              <h3 className="font-bold text-white text-lg">Welcome to OMC Day Closing Manager</h3>
              <p className="text-xs text-slate-400">Fast, private daily station reporting — now with optional AI meter-reading assistance.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-sm text-slate-300">
          <p>
            This app helps station managers record pump meter readings, tank dipstick (dippings), and daily expenses. Each user has a private workspace — switch accounts in "Account & Station Workspace".
          </p>

          <p>
            How to use:
            <ul className="list-disc ml-5 mt-2 text-xs text-slate-400">
              <li>Go to the Meters tab and tap a pump to capture a photo of the meter.</li>
              <li>Use the AI Reader (optional) to get a suggested reading from the photo. Verify before accepting — manual entry remains authoritative.</li>
              <li>Dippings remain under each product in the Stock section — capture a tank photo after measuring dipstick; the physical closing stock will be saved.</li>
              <li>To stay logged in on this device, create an account — you can choose to persist the session in Account settings.</li>
            </ul>
          </p>

          <p className="text-xs text-slate-400">
            Security: account data is stored locally by default and can be connected to a Supabase project for cloud sync with RLS and proper per-user access controls. Do not add secret keys here.
          </p>

          <div className="pt-3 flex items-center justify-end">
            <button onClick={onClose} className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-xs">Got it</button>
          </div>
        </div>
      </div>
    </div>
  );
};
