import React, { useRef } from 'react';
import { Image as ImageIcon, Camera, MapPin, User, FileText, BarChart2, Calendar, X } from 'lucide-react';
import clsx from 'clsx';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAction: (action: string, data?: any) => void;
}

export function AttachmentMenu({ isOpen, onClose, onAction }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />
      <div className="absolute bottom-20 left-4 right-4 md:left-auto md:w-80 bg-black/60 backdrop-blur-xl border border-white/10 rounded-3xl p-4 shadow-2xl z-50 animate-in slide-in-from-bottom-5">
        <div className="grid grid-cols-4 gap-y-6 gap-x-2">
          <MenuButton icon={<ImageIcon size={24} />} label="Gallery" color="bg-premium-blue" onClick={() => fileInputRef.current?.click()} />
          <MenuButton icon={<Camera size={24} />} label="Camera" color="bg-master-red" onClick={() => cameraInputRef.current?.click()} />
          <MenuButton icon={<MapPin size={24} />} label="Location" color="bg-green-600" onClick={() => onAction('location')} />
          <MenuButton icon={<User size={24} />} label="Contact" color="bg-premium-blue-light" onClick={() => onAction('contact')} />
          <MenuButton icon={<FileText size={24} />} label="Document" color="bg-indigo-500" onClick={() => docInputRef.current?.click()} />
          <MenuButton icon={<BarChart2 size={24} />} label="Poll" color="bg-yellow-600" onClick={() => onAction('poll')} />
          <MenuButton icon={<Calendar size={24} />} label="Event" color="bg-purple-600" onClick={() => onAction('event')} />
        </div>
        
        {/* Hidden inputs */}
        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => {
           if(e.target.files) {
             onAction('gallery', e.target.files[0]);
             e.target.value = '';
           }
        }} />
        <input type="file" ref={docInputRef} className="hidden" accept="application/pdf,.doc,.docx,.txt" onChange={(e) => {
           if(e.target.files) {
             onAction('document', e.target.files[0]);
             e.target.value = '';
           }
        }} />
        <input type="file" ref={cameraInputRef} className="hidden" accept="image/*" capture="environment" onChange={(e) => {
           if(e.target.files) {
             onAction('camera', e.target.files[0]);
             e.target.value = '';
           }
        }} />
      </div>
    </>
  );
}

function MenuButton({ icon, label, color, onClick }: { icon: React.ReactNode, label: string, color: string, onClick: () => void }) {
  return (
    <div className="flex flex-col items-center gap-2 cursor-pointer group" onClick={onClick}>
      <div className={clsx("w-14 h-14 rounded-full flex items-center justify-center text-white shadow-lg transition-transform group-hover:scale-105", color)}>
        {icon}
      </div>
      <span className="text-xs text-gray-300 font-medium">{label}</span>
    </div>
  );
}
