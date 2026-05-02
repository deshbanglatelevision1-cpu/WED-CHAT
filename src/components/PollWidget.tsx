import React, { useEffect, useState } from 'react';
import { subscribeToPoll, votePoll } from '../lib/firestoreService';
import { Poll } from '../types';
import clsx from 'clsx';
import { Check } from 'lucide-react';

export function PollWidget({ roomId, pollId, currentUserId }: { roomId: string, pollId: string, currentUserId: string }) {
  const [poll, setPoll] = useState<Poll | null>(null);

  useEffect(() => {
    if (!roomId || !pollId || !currentUserId) return;
    const unsubscribe = subscribeToPoll(roomId, pollId, (data) => {
      setPoll(data);
    });
    return () => unsubscribe();
  }, [roomId, pollId, currentUserId]);

  if (!poll) return <div className="text-sm text-gray-400">Loading poll...</div>;

  const totalVotes = Object.keys(poll.votes || {}).length;
  const myVote = poll.votes?.[currentUserId];

  const handleVote = (idx: number) => {
    votePoll(roomId, pollId, idx, currentUserId);
  };

  return (
    <div className="bg-black/20 rounded-xl p-4 w-full min-w-[250px]">
      <h4 className="font-bold text-white mb-3 text-lg">{poll.question}</h4>
      <div className="flex flex-col gap-2">
        {poll.options.map((opt, idx) => {
          const voteCount = Object.values(poll.votes || {}).filter(v => v === idx).length;
          const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
          const isSelected = myVote === idx;
          return (
            <button key={idx} onClick={() => handleVote(idx)} className="relative overflow-hidden w-full text-left bg-black/40 border border-white/5 rounded-lg p-3 hover:bg-white/10 transition group">
              <div className="absolute left-0 top-0 bottom-0 bg-premium-blue/40 transition-all duration-500 ease-out" style={{ width: `${percentage}%` }} />
              <div className="relative flex justify-between items-center z-10 w-full">
                <div className="flex items-center gap-2">
                  <div className={clsx("w-4 h-4 rounded-full border flex items-center justify-center transition-colors", isSelected ? "border-master-red bg-master-red" : "border-gray-500 group-hover:border-gray-300")}>
                    {isSelected && <Check size={10} className="text-white" />}
                  </div>
                  <span className="text-white truncate max-w-[150px] sm:max-w-[200px] font-medium">{opt}</span>
                </div>
                {totalVotes > 0 && <span className="text-xs text-gray-300">{percentage}%</span>}
              </div>
            </button>
          );
        })}
      </div>
      <div className="text-xs text-center text-gray-400 mt-3 pt-2 border-t border-white/10">
        {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}
      </div>
    </div>
  );
}
