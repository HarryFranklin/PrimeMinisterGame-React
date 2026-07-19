import React from 'react';
import { ElectionCycle } from '../utils/types';
import { getPMProfile } from '../utils/pmProfiles';

interface PMIdentityBannerProps {
  cycle: ElectionCycle;
  className?: string;
}

export default function PMIdentityBanner({ cycle, className = '' }: PMIdentityBannerProps) {
  const profile = getPMProfile(cycle);
  const levelNumber = cycle + 1;

  return (
    <div className={`flex items-center justify-center gap-3 ${className}`}>
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center text-4xl shrink-0 shadow-inner"
        style={{ backgroundColor: `${profile.color}22` }}
      >
        {profile.emoji}
      </div>
      <div className="text-left">
        <span className="text-[12px] font-black uppercase tracking-widest text-zinc-400 block leading-tight">
          Level {levelNumber}
        </span>
        <h3 className="font-black text-base text-zinc-900 leading-tight">{profile.name}</h3>
      </div>
    </div>
  );
}