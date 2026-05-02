import React, { useState } from 'react';
import { X } from 'lucide-react';
import clsx from 'clsx';

export function PollModal({ onClose, onSubmit }: { onClose: () => void, onSubmit: (q: string, options: string[]) => void }) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);

  const handleAddOption = () => {
    if (options.length < 10) setOptions([...options, ""]);
  };

  const handleOptionChange = (idx: number, val: string) => {
    const newOptions = [...options];
    newOptions[idx] = val;
    setOptions(newOptions);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validOptions = options.filter(o => o.trim());
    if (question.trim() && validOptions.length >= 2) {
      onSubmit(question, validOptions);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0A0E1A] border border-white/10 rounded-2xl p-6 w-full max-w-sm relative shadow-2xl">
        <button onClick={onClose} className="absolute right-4 top-4 text-gray-400 hover:text-white"><X size={20} /></button>
        <h3 className="text-xl font-bold text-white mb-4">Create Poll</h3>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input 
            type="text" required placeholder="Ask a question" value={question} onChange={e => setQuestion(e.target.value)}
            className="bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-premium-blue"
          />
          <div className="flex flex-col gap-2 max-h-48 overflow-y-auto custom-scrollbar">
            {options.map((opt, idx) => (
              <input key={idx} required={idx < 2} type="text" placeholder={`Option ${idx + 1}`} value={opt} onChange={e => handleOptionChange(idx, e.target.value)}
                className="bg-black/40 border border-white/10 rounded-lg p-2 text-white focus:outline-none focus:border-premium-blue text-sm"
              />
            ))}
          </div>
          {options.length < 10 && <button type="button" onClick={handleAddOption} className="text-premium-blue text-sm text-left hover:underline">+ Add Option</button>}
          
          <button type="submit" className="w-full bg-master-red text-white py-3 font-bold rounded-lg mt-2">Send Poll</button>
        </form>
      </div>
    </div>
  );
}

export function EventModal({ onClose, onSubmit }: { onClose: () => void, onSubmit: (t: string, d: string, time: string) => void }) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title && date && time) onSubmit(title, date, time);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0A0E1A] border border-white/10 rounded-2xl p-6 w-full max-w-sm relative shadow-2xl">
        <button onClick={onClose} className="absolute right-4 top-4 text-gray-400 hover:text-white"><X size={20} /></button>
        <h3 className="text-xl font-bold text-white mb-4">Create Event</h3>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input 
            type="text" required placeholder="Event Title" value={title} onChange={e => setTitle(e.target.value)}
            className="bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-premium-blue"
          />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-400">Date</label>
              <input type="date" required value={date} onChange={e => setDate(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-premium-blue" />
            </div>
            <div>
              <label className="text-xs text-gray-400">Time</label>
              <input type="time" required value={time} onChange={e => setTime(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-premium-blue" />
            </div>
          </div>
          <button type="submit" className="w-full bg-master-red text-white py-3 font-bold rounded-lg mt-2">Send Event</button>
        </form>
      </div>
    </div>
  );
}
