export interface UserProfile {
  uid: string;
  displayName: string;
  photoURL?: string;
  email?: string;
  bio?: string;
  preferredLanguage?: string;
  uniqueId: string;
  contacts: string[];
}

export interface User {
  uid: string;
  displayName: string | null;
  photoURL: string | null;
  email: string | null;
}

export interface Community {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  adminIds: string[];
  memberIds: string[];
  uniqueId: string;
  createdAt: number;
  photoURL?: string;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  adminIds: string[];
  memberIds: string[];
  uniqueId: string; // 5-digit ID
  communityId?: string;
  createdAt: number;
  photoURL?: string;
}

export interface Room {
  id: string;
  name: string;
  createdBy: string;
  createdAt: number;
  lastMessage?: string;
  lastMessageAt?: number;
  lastMessageSenderId?: string;
  lastMessageStatus?: 'sent' | 'delivered' | 'seen';
  isAI?: boolean;
  participants?: string[];
  type?: '1on1' | 'group' | 'announcement';
  groupId?: string;
  communityId?: string;
}

export interface Message {
  id: string;
  text?: string;
  imageUrl?: string;
  audioUrl?: string;
  fileUrl?: string;
  fileName?: string;
  pollId?: string;
  location?: { lat: number, lng: number };
  event?: { title: string, date: string, time: string };
  status?: 'sent' | 'delivered' | 'seen';
  seenBy?: string[];
  senderId: string;
  senderName: string;
  senderPhotoURL?: string;
  createdAt: number;
  isAI?: boolean;
  reactions?: Record<string, string>; // uid -> emoji
  replyTo?: {
    id: string;
    senderName: string;
    text?: string;
    imageUrl?: string;
  };
}

export interface Poll {
  id: string;
  roomId: string;
  question: string;
  options: string[];
  votes: Record<string, number>; // uid -> option index
  createdBy: string;
  createdAt: number;
}

export interface Story {
  id: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  imageUrl?: string;
  text?: string;
  createdAt: number;
  expiresAt: number;
  viewers: string[];
}
