// app/components/modals/IntroductionModal.tsx
import React from 'react';

interface IntroductionModalProps {
  onStart: () => void;
}

export default function IntroductionModal({ onStart }: IntroductionModalProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-900 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8 md:p-10 border border-zinc-200 animate-in zoom-in duration-300">
        <h1 className="text-3xl font-black tracking-tight text-zinc-900 mb-4">Welcome, Prime Minister.</h1>
        <div className="space-y-4 text-zinc-700 leading-relaxed mb-8">
          <p>
            You have just won the general election by a razor-thin margin. The public is divided, the economy is fragile, and your mandate to govern is under immediate scrutiny.
          </p>
          <p>
            You have inherited a strict set of public mandates. Your role is not just to pass policies, but to navigate the complex trade-offs of utility, inequality, and public satisfaction.
          </p>
          <p>
            You will face difficult decisions. You cannot please everyone. Your legacy will be defined by <em>how</em> you balance the competing needs of your electorate over the coming election cycles.
          </p>
        </div>
        <div className="flex justify-end">
          <button 
            type="button"
            onClick={onStart}
            className="px-8 py-4 bg-zinc-900 text-white font-bold rounded-xl hover:bg-black transition-all shadow-lg active:scale-95"
          >
            Enter 10 Downing Street
          </button>
        </div>
      </div>
    </div>
  );
}