import React, { useState } from 'react';
import { X, Image as ImageIcon, Send } from 'lucide-react';
import { uploadFileToStorage } from '../lib/storageService';
import { Story } from '../types';
import { formatDistanceToNow } from 'date-fns';

export const StoryUploadModal = ({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (imageUrl?: string, text?: string) => Promise<void>;
}) => {
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() && !file) return;
    setIsUploading(true);
    try {
      let url;
      if (file) {
        url = await uploadFileToStorage(file, `stories/${Date.now()}_${file.name}`);
      }
      await onSubmit(url, text.trim());
      onClose();
    } catch (err) {
      console.error(err);
      setIsUploading(false);
      alert('Failed to upload story');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-[#1A2332] border border-premium-blue/30 rounded-2xl w-full max-w-sm overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.5)]">
        <div className="flex justify-between items-center p-4 border-b border-white/5 bg-premium-blue">
          <h3 className="font-bold text-white text-lg">Add Story</h3>
          <button onClick={onClose} className="text-white/70 hover:text-white transition">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-4">
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Type a status..."
            className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-premium-blue resize-none h-24"
          />
          <div className="flex items-center gap-2">
            <input
              type="file"
              accept="image/*"
              id="story-image"
              className="hidden"
              onChange={e => setFile(e.target.files?.[0] || null)}
            />
            <label
              htmlFor="story-image"
              className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-gray-300 cursor-pointer transition flex-1 justify-center"
            >
              <ImageIcon size={18} />
              {file ? file.name : "Add Photo"}
            </label>
          </div>
          <button
            type="submit"
            disabled={isUploading || (!text.trim() && !file)}
            className="w-full bg-premium-blue hover:bg-premium-blue-light text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed mt-2 shadow-lg"
          >
            {isUploading ? "Uploading..." : "Share Story"}
            {!isUploading && <Send size={18} />}
          </button>
        </form>
      </div>
    </div>
  );
};

export const StoryViewModal = ({
  story,
  onClose,
}: {
  story: Story;
  onClose: () => void;
}) => {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-xl animate-in fade-in" onClick={onClose}>
      <div className="absolute top-4 right-4 z-10">
        <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 text-white transition">
          <X size={24} />
        </button>
      </div>
      
      <div className="w-full max-w-md h-full sm:h-[85vh] sm:rounded-3xl overflow-hidden relative shadow-2xl flex flex-col items-center justify-center bg-[#111]" onClick={e => e.stopPropagation()}>
        {/* Progress Bar (Mock) */}
        <div className="absolute top-0 left-0 right-0 p-3 z-10 bg-gradient-to-b from-black/60 to-transparent">
          <div className="h-1 bg-white/30 rounded-full overflow-hidden">
            <div className="h-full bg-white w-full animate-[progress_5s_linear]"></div>
          </div>
          <div className="flex items-center gap-3 mt-3">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-premium-blue">
              {story.userPhoto ? (
                <img src={story.userPhoto} alt={story.userName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white font-bold">{story.userName.charAt(0)}</div>
              )}
            </div>
            <div>
              <div className="text-white font-bold text-sm shadow-black drop-shadow-md">{story.userName}</div>
              <div className="text-white/70 text-xs shadow-black drop-shadow-md">
                {typeof story.createdAt === 'number' ? formatDistanceToNow(story.createdAt) : '...'} ago
              </div>
            </div>
          </div>
        </div>

        {story.imageUrl ? (
          <img src={story.imageUrl} alt="Story" className="w-full h-full object-contain" />
        ) : (
          <div className="flex items-center justify-center h-full w-full bg-gradient-to-br from-premium-blue to-[#0A051A] p-8">
            <p className="text-3xl text-white font-bold text-center leading-relaxed">
              {story.text}
            </p>
          </div>
        )}

        {story.imageUrl && story.text && (
          <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
            <p className="text-white text-lg text-center font-medium drop-shadow-lg">{story.text}</p>
          </div>
        )}
      </div>
    </div>
  );
};
