/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useRef } from "react";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { auth, loginWithGoogle, logout } from "./lib/firebase";
import { subscribeToRooms, subscribeToMessages, createRoom, sendMessage, sendImageMessage, sendStructuredMessage, updateMessageStatus, markMessagesAsSeen, deleteMessage, getOrCreateUserProfile, searchUserByUniqueId, searchUserByEmail, searchUserByDisplayName, addContact, subscribeToUserProfile, fetchContactsProfiles, getOrCreate1on1Room, subscribeToStories, addStory, markStorySeen, addReaction, updateTypingStatus, subscribeToTypingStatus, subscribeToGroups, subscribeToCommunities, createGroup, joinGroupByCode, createCommunity, subscribeToGroupMessages, subscribeToAnnouncements, sendGroupMessage, sendAnnouncement } from "./lib/firestoreService";
import { encryptMessage, decryptMessage } from "./lib/encryption";
import { getAIResponse, getSmartReplies, translateText } from "./lib/ai";
import { Room, Message, UserProfile, Story, Group, Community } from "./types";
import { MessageCircle, Menu, X, Send, Lock, Plus, LogOut, Key, Bot, Image as ImageIcon, Check, CheckCheck, UserPlus, Search, Paperclip, Mic, Smile, QrCode, Volume2, Copy, Scissors, Trash2, MousePointer2, Languages, Sticker, Users, Shield, UserCircle2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { format } from "date-fns";
import clsx from "clsx";
import { AttachmentMenu } from "./components/AttachmentMenu";
import { PollModal, EventModal } from "./components/ActionModals";
import { PollWidget } from "./components/PollWidget";
import { LocationWidget, DocumentWidget, EventWidget, AudioWidget } from "./components/MessageWidgets";
import { StoryUploadModal, StoryViewModal } from "./components/StoryModals";
import { QrScannerModal } from "./components/QrScannerModal";
import { uploadFileToStorage } from "./lib/storageService";

const LANGUAGES = [
  "English", "Spanish", "French", "German", "Chinese", "Japanese", 
  "Korean", "Arabic", "Russian", "Portuguese", "Hindi", "Bengali",
  "Italian", "Turkish", "Vietnamese"
];

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [contactProfiles, setContactProfiles] = useState<UserProfile[]>([]);
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [aiMessages, setAiMessages] = useState<Message[]>([]);
  const [isAITyping, setIsAITyping] = useState(false);
  const [stories, setStories] = useState<Story[]>([]);
  const [smartReplies, setSmartReplies] = useState<string[]>([]);
  const [activeReactionMessageId, setActiveReactionMessageId] = useState<string | null>(null);
  const [showStoryUpload, setShowStoryUpload] = useState(false);
  const [viewingStory, setViewingStory] = useState<Story | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [secretKey, setSecretKey] = useState<string>("NAMWEB-SECRET");
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);
  const [searchId, setSearchId] = useState("");
  const [contactResult, setContactResult] = useState<UserProfile | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showNotFound, setShowNotFound] = useState(false);
  const [searchErrorMessage, setSearchErrorMessage] = useState("");
  
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showPollModal, setShowPollModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showMyQr, setShowMyQr] = useState(false);
  const [viewingUserProfile, setViewingUserProfile] = useState<UserProfile | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [replyTarget, setReplyTarget] = useState<Message | null>(null);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [gifSearch, setGifSearch] = useState("");
  const [gifs, setGifs] = useState<any[]>([]);
  const [isSearchingGifs, setIsSearchingGifs] = useState(false);
  const [editProfileName, setEditProfileName] = useState("");
  const [editProfileBio, setEditProfileBio] = useState("");
  const [contextMenuMessage, setContextMenuMessage] = useState<Message | null>(null);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [isTranslating, setIsTranslating] = useState<string | null>(null);
  const [targetLanguage, setTargetLanguage] = useState<string>("Bengali");
  const [showChatSearch, setShowChatSearch] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState("");
  const [messageToDelete, setMessageToDelete] = useState<Message | null>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const typingTimeoutRef = useRef<number | null>(null);

  const [activeTab, setActiveTab] = useState<'chats' | 'stories' | 'ai' | 'groups' | 'communities'>('chats');
  const [groups, setGroups] = useState<Group[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showCreateCommunity, setShowCreateCommunity] = useState(false);
  const [showJoinByCode, setShowJoinByCode] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [selectedContactsForGroup, setSelectedContactsForGroup] = useState<string[]>([]);
  const [groupName, setGroupName] = useState("");
  const [communityName, setCommunityName] = useState("");
  const [showGroupProfile, setShowGroupProfile] = useState(false);
  const [groupInviteSearch, setGroupInviteSearch] = useState("");
  const [groupInviteResults, setGroupInviteResults] = useState<UserProfile[]>([]);
  const [isInviteSearching, setIsInviteSearching] = useState(false);
  const [groupMembers, setGroupMembers] = useState<UserProfile[]>([]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const recordingTimeRef = useRef<number>(0);
  const isRecordingCancelledRef = useRef<boolean>(false);
  const swipeRef = useRef<{ id: string, startX: number } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const getReplyToData = () => {
    if (!replyTarget) return undefined;
    return {
      id: replyTarget.id,
      senderName: replyTarget.senderName,
      ...(replyTarget.text && { text: decryptMessage(replyTarget.text, secretKey) }),
      ...(replyTarget.imageUrl && { imageUrl: replyTarget.imageUrl })
    };
  };

  const getCurrentUserData = () => {
    if (!user) return null;
    return {
      uid: user.uid,
      displayName: userProfile?.displayName || user.displayName || "Unknown",
      photoURL: userProfile?.photoURL || user.photoURL || undefined,
    };
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const profile = await getOrCreateUserProfile({
          uid: u.uid,
          displayName: u.displayName,
          photoURL: u.photoURL,
          email: u.email,
        });
        if (profile) {
          setEditProfileName(profile.displayName);
          setEditProfileBio(profile.bio || "");
        }
      }
      setAuthInitialized(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      const unsubscribeProfile = subscribeToUserProfile(user.uid, async (profile) => {
        setUserProfile(profile);
        if (profile.preferredLanguage) {
          setTargetLanguage(profile.preferredLanguage);
        }
        if (profile.contacts && profile.contacts.length > 0) {
          const profiles = await fetchContactsProfiles(profile.contacts);
          setContactProfiles(profiles);
        }
      });
      const unsubscribeRooms = subscribeToRooms(user.uid, (allRooms) => {
        // Since we already filtered in the query, we just set the rooms
        // but we can double check or filter AI rooms if they are global
        setRooms(allRooms);
      });
      const unsubscribeStories = subscribeToStories((s) => {
         setStories(s);
      });
      const unsubscribeGroups = subscribeToGroups(user.uid, (g) => {
        setGroups(g);
      });
      const unsubscribeCommunities = subscribeToCommunities(user.uid, (c) => {
        setCommunities(c);
      });
      return () => {
        unsubscribeProfile();
        unsubscribeRooms();
        unsubscribeStories();
        unsubscribeGroups();
        unsubscribeCommunities();
      };
    }
  }, [user]);

  useEffect(() => {
    if (currentRoom && currentRoom.id !== 'AI_MASTER' && user) {
      let unsubscribe;
      if (currentRoom.type === 'group') {
        unsubscribe = subscribeToGroupMessages(currentRoom.groupId!, setMessages);
      } else if (currentRoom.type === 'announcement') {
        unsubscribe = subscribeToAnnouncements(currentRoom.communityId!, setMessages);
      } else {
        unsubscribe = subscribeToMessages(currentRoom.id, setMessages);
      }
      setShowChatSearch(false);
      setChatSearchQuery("");
      return () => unsubscribe();
    } else if (currentRoom?.id === 'AI_MASTER') {
      setShowChatSearch(false);
      setChatSearchQuery("");
      // Clear messages for AI Master if needed, or they are handled separately
      setMessages([]);
    }

    if (currentRoom && currentRoom.id !== 'AI_MASTER') {
       const unsubscribeTyping = subscribeToTypingStatus(currentRoom.id, (users) => {
         setTypingUsers(users.filter(uid => uid !== user?.uid));
       });
       return () => unsubscribeTyping();
    }
  }, [currentRoom, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, aiMessages]);

  useEffect(() => {
    if (currentRoom && currentRoom.id !== 'AI_MASTER' && user && messages.length > 0) {
      markMessagesAsSeen(currentRoom.id, messages, user.uid, currentRoom.type || 'room').catch(console.error);

      // Smart Reply trigger
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.senderId !== user.uid && lastMsg.text && !lastMsg.isAI) {
        const decrypted = decryptMessage(lastMsg.text, secretKey);
        getSmartReplies(decrypted).then(replies => {
          setSmartReplies(replies);
        });
      } else {
        setSmartReplies([]);
      }
    } else {
      setSmartReplies([]);
    }
  }, [messages, currentRoom, user, secretKey]);

  const handleSearchContact = async () => {
    const term = searchId.trim().toUpperCase();
    if (term.length >= 5) {
      setIsSearching(true);
      setShowNotFound(false);
      setSearchErrorMessage("");
      setContactResult(null);

      // Self-search check
      if (userProfile && term === userProfile.uniqueId) {
        setSearchErrorMessage("You cannot add yourself!");
        setShowNotFound(true);
        setIsSearching(false);
        return;
      }

      const result = await searchUserByUniqueId(term);
      if (result) {
        setContactResult(result);
      } else {
        setSearchErrorMessage("User not found! Please check ID.");
        setShowNotFound(true);
      }
      setIsSearching(false);
    } else {
      setSearchErrorMessage("Enter a valid 5+ digit ID.");
      setShowNotFound(true);
    }
  };

  const handleQrScan = async (scannedId: string) => {
    setShowScanner(false);
    const term = scannedId.trim().toUpperCase();
    setSearchId(term);
    
    if (term.length >= 5) {
      if (userProfile && term === userProfile.uniqueId) {
        alert("You cannot add yourself!");
        return;
      }
      setIsSearching(true);
      setShowNotFound(false);
      setContactResult(null);
      const result = await searchUserByUniqueId(term);
      if (result) {
        setContactResult(result);
        setShowAddContact(true);
      } else {
        alert("User not found!");
      }
      setIsSearching(false);
    }
  };

  const handleAddContact = async () => {
    if (user && contactResult && userProfile && !userProfile.contacts.includes(contactResult.uid)) {
      await addContact(user.uid, contactResult.uid);
      setSearchId("");
      setContactResult(null);
      setShowAddContact(false);
    }
  };

  const open1on1Room = async (contact: UserProfile) => {
    if (!user) return;
    const roomId = await getOrCreate1on1Room(user.uid, contact.uid, contact.displayName);
    const room = rooms.find(r => r.id === roomId) || {
      id: roomId!,
      name: contact.displayName,
      createdBy: user.uid,
      createdAt: Date.now(),
      participants: [user.uid, contact.uid]
    };
    setCurrentRoom(room as Room);
    setIsSidebarOpen(false);
  };

  const handleCreateRoom = async () => {
    const name = prompt("Enter new chat room name:");
    if (name && user) {
      await createRoom(name.trim(), user.uid);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentRoom || !user) return;

    if (!secretKey) {
        alert("Please set an E2EE Secret Key first.");
        return;
    }

    const encryptedText = encryptMessage(newMessage.trim(), secretKey);
    const replyToData = getReplyToData();

    setNewMessage("");
    setReplyTarget(null);

    if (currentRoom.id === 'AI_MASTER') {
      const userMsg: Message = {
        id: Date.now().toString(),
        text: newMessage.trim(),
        senderId: user.uid,
        senderName: user.displayName || "You",
        createdAt: Date.now(),
        status: 'seen'
      };
      setAiMessages(prev => [...prev, userMsg]);
      const messageText = newMessage.trim();
      setIsAITyping(true);
      
      const aiReply = await getAIResponse(messageText);
      setIsAITyping(false);
      
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: aiReply,
        senderId: 'ai',
        senderName: 'AI Master',
        createdAt: Date.now(),
        isAI: true,
        status: 'seen'
      };
      setAiMessages(prev => [...prev, aiMsg]);
      return;
    }

    const userData = getCurrentUserData();
    if (!userData) return;

    if (currentRoom.type === 'group') {
      await sendGroupMessage(currentRoom.groupId!, encryptedText, userData);
    } else if (currentRoom.type === 'announcement') {
      await sendAnnouncement(currentRoom.communityId!, encryptedText, userData);
    } else {
      await sendMessage(currentRoom.id, encryptedText, userData, replyToData);
    }
  };

  const checkCameraPermission = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Your browser does not support camera access.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error: any) {
      console.error("Camera access error:", error);
      let message = "Could not access camera.";
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        message = "Camera permission denied. Please allow it in browser settings.";
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        message = "No camera found on your device.";
      }
      setCameraError(message);
      return false;
    }
  };

  const handleAttachmentAction = async (action: string, data?: any) => {
    setShowAttachmentMenu(false);
    if (!currentRoom || !user || currentRoom.id === 'AI_MASTER') return;

    try {
      if (action === 'camera') {
        const hasPermission = await checkCameraPermission();
        if (!hasPermission) return;
      }

      if (action === 'gallery' || action === 'camera') {
        const file = data as File;
        setIsUploading(true);
        try {
          const url = await uploadFileToStorage(file, `rooms/${currentRoom.id}/images/${Date.now()}_${file.name}`);
          const encryptedLastMessage = encryptMessage("📷 Image", secretKey);
          const replyToData = getReplyToData();
          const userData = getCurrentUserData();

          if (userData) {
            await sendImageMessage(currentRoom.id, url, encryptedLastMessage, userData, replyToData);
            setReplyTarget(null);
          }
        } catch (e) {
          console.error(e);
        } finally {
          setIsUploading(false);
        }
      } else if (action === 'document') {
        const file = data as File;
        setIsUploading(true);
        try {
          const url = await uploadFileToStorage(file, `rooms/${currentRoom.id}/documents/${Date.now()}_${file.name}`);
          const replyToData = getReplyToData();
          const userData = getCurrentUserData();

          if (userData) {
            await sendStructuredMessage(currentRoom.id, { fileUrl: url, fileName: file.name }, `📎 Document: ${file.name}`, userData, replyToData);
            setReplyTarget(null);
          }
        } catch (e) {
          console.error(e);
        } finally {
          setIsUploading(false);
        }
      } else if (action === 'location') {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(async (pos) => {
            const { latitude, longitude } = pos.coords;
            const { sendStructuredMessage } = await import('./lib/firestoreService');
            
            const replyToData = getReplyToData();
            const userData = getCurrentUserData();

            if (userData) {
              await sendStructuredMessage(currentRoom.id, { location: { lat: latitude, lng: longitude } }, "📍 Location", userData, replyToData);
              setReplyTarget(null);
            }
          }, undefined, { enableHighAccuracy: true });
        } else {
          alert("Geolocation is not supported by this browser.");
        }
      } else if (action === 'contact') {
        setIsSidebarOpen(true);
        setShowAddContact(true);
      } else if (action === 'poll') {
        setShowPollModal(true);
      } else if (action === 'event') {
        setShowEventModal(true);
      }
    } catch (err) {
      console.error(err);
      alert("Error processing attachment");
      setIsUploading(false);
    }
  };

  const handleCreatePoll = async (question: string, options: string[]) => {
    if (!currentRoom || !user) return;
    setShowPollModal(false);
    const { createPoll, sendStructuredMessage } = await import('./lib/firestoreService');
    const pollId = await createPoll(currentRoom.id, question, options, user.uid);
    if (pollId) {
      const userData = getCurrentUserData();
      const replyToData = getReplyToData();
      if (userData) {
        await sendStructuredMessage(currentRoom.id, { pollId }, `📊 Poll: ${question}`, userData, replyToData);
        setReplyTarget(null);
      }
    }
  };

  const handleCreateEvent = async (title: string, date: string, time: string) => {
    if (!currentRoom || !user) return;
    setShowEventModal(false);
    const { sendStructuredMessage } = await import('./lib/firestoreService');
    const userData = getCurrentUserData();
    const replyToData = getReplyToData();
    if (userData) {
      await sendStructuredMessage(currentRoom.id, { event: { title, date, time } }, `📅 Event: ${title}`, userData, replyToData);
      setReplyTarget(null);
    }
  };

  const handleUpdateProfile = async () => {
    if (!user) return;
    const { updateUserProfile } = await import("./lib/firestoreService");
    await updateUserProfile(user.uid, {
      displayName: editProfileName,
      bio: editProfileBio,
      preferredLanguage: targetLanguage,
    });
    setShowProfileEdit(false);
  };

  const handleCreateGroup = async () => {
    if (!user || !groupName.trim() || selectedContactsForGroup.length === 0) return;
    try {
      await createGroup(groupName.trim(), "", selectedContactsForGroup, user.uid);
      setGroupName("");
      setSelectedContactsForGroup([]);
      setShowCreateGroup(false);
    } catch (error) {
      console.error(error);
      alert("Failed to create group");
    }
  };

  const handleJoinByCode = async () => {
    if (!user || joinCode.length !== 5) return;
    try {
      const gid = await joinGroupByCode(joinCode, user.uid);
      if (gid) {
        setJoinCode("");
        setShowJoinByCode(false);
        setActiveTab('groups');
      } else {
        alert("Group not found!");
      }
    } catch (error) {
      console.error(error);
      alert("Error joining group");
    }
  };

  const handleCreateCommunity = async () => {
    if (!user || !communityName.trim()) return;
    try {
      await createCommunity(communityName.trim(), "", user.uid);
      setCommunityName("");
      setShowCreateCommunity(false);
      setActiveTab('communities');
    } catch (error) {
      console.error(error);
      alert("Failed to create community");
    }
  };

  useEffect(() => {
    if (showGroupProfile && currentRoom?.groupId) {
      const group = groups.find(g => g.id === currentRoom.groupId);
      if (group) {
        fetchContactsProfiles(group.memberIds).then(setGroupMembers);
      }
    }
  }, [showGroupProfile, currentRoom, groups]);

  const handleGroupInviteSearch = async () => {
    if (!groupInviteSearch.trim()) return;
    setIsInviteSearching(true);
    try {
      let results: UserProfile[] = [];
      if (groupInviteSearch.includes('@')) {
        const user = await searchUserByEmail(groupInviteSearch.trim());
        if (user) results = [user];
      } else if (groupInviteSearch.startsWith('DB-')) {
        const user = await searchUserByUniqueId(groupInviteSearch.trim());
        if (user) results = [user];
      } else {
        results = await searchUserByDisplayName(groupInviteSearch.trim());
      }
      setGroupInviteResults(results.filter(r => r.uid !== user?.uid));
    } catch (error) {
      console.error(error);
    } finally {
      setIsInviteSearching(false);
    }
  };

  const handleAddMemberToGroup = async (userId: string) => {
    if (!currentRoom?.groupId) return;
    try {
      const { addUserToGroup } = await import("./lib/firestoreService");
      await addUserToGroup(currentRoom.groupId, userId);
      setGroupInviteSearch("");
      setGroupInviteResults([]);
    } catch (error) {
      console.error(error);
    }
  };

  const handleRemoveMemberFromGroup = async (userId: string) => {
    if (!currentRoom?.groupId) return;
    if (!confirm("Are you sure you want to remove this member?")) return;
    try {
      const { removeUserFromGroup } = await import("./lib/firestoreService");
      await removeUserFromGroup(currentRoom.groupId, userId);
    } catch (error) {
      console.error(error);
    }
  };

  const handleLeaveGroup = async () => {
    if (!currentRoom?.groupId || !user) return;
    if (!confirm("Are you sure you want to leave this group?")) return;
    try {
      const { removeUserFromGroup } = await import("./lib/firestoreService");
      await removeUserFromGroup(currentRoom.groupId, user.uid);
      setShowGroupProfile(false);
      setCurrentRoom(null);
    } catch (error) {
      console.error(error);
    }
  };

  const handleProfileImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && user) {
      setIsUploading(true);
      try {
        const url = await uploadFileToStorage(file, `profiles/${user.uid}/${Date.now()}_${file.name}`);
        const { updateUserProfile } = await import("./lib/firestoreService");
        await updateUserProfile(user.uid, { photoURL: url });
      } catch (err) {
        console.error(err);
      } finally {
        setIsUploading(false);
      }
    }
  };

  const onTouchStart = (e: React.TouchEvent, msg: Message) => {
    if (currentRoom?.id === 'AI_MASTER') return;
    swipeRef.current = { id: msg.id, startX: e.touches[0].clientX };
  };

  const onTouchMove = (e: React.TouchEvent, msg: Message) => {
    if (!swipeRef.current || swipeRef.current.id !== msg.id) return;
    const currentX = e.touches[0].clientX;
    const diffX = currentX - swipeRef.current.startX;
    
    // Only handle swipe to right
    if (diffX > 0) {
      const element = e.currentTarget as HTMLElement;
      element.style.transform = `translateX(${Math.min(diffX, 100)}px)`;
      element.style.transition = 'none';
    }
  };

  const onTouchEnd = (e: React.TouchEvent, msg: Message) => {
    if (!swipeRef.current || swipeRef.current.id !== msg.id) return;
    const currentX = e.changedTouches[0].clientX;
    const diffX = currentX - swipeRef.current.startX;
    
    const element = e.currentTarget as HTMLElement;
    element.style.transform = 'translateX(0px)';
    element.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
    
    if (diffX > 80) {
      setReplyTarget(msg);
    }
    swipeRef.current = null;
  };

  const handleMessageCopy = (msg: Message) => {
    const text = decryptMessage(msg.text || "", secretKey);
    navigator.clipboard.writeText(text);
    setContextMenuMessage(null);
  };

  const handleMessageSpeak = (msg: Message) => {
    const text = decryptMessage(msg.text || "", secretKey);
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
    setContextMenuMessage(null);
  };

  const handleMessageDelete = (msg: Message) => {
    setMessageToDelete(msg);
    setContextMenuMessage(null);
  };

  const confirmDelete = async () => {
    if (!currentRoom || !messageToDelete) return;
    try {
      await deleteMessage(currentRoom.id, messageToDelete.id);
    } catch (err) {
      console.error(err);
    }
    setMessageToDelete(null);
  };

  const handleMessageCut = (msg: Message) => {
    handleMessageCopy(msg);
    if (msg.senderId === user?.uid) {
      handleMessageDelete(msg);
    }
  };

  const handleTranslate = async (msg: Message) => {
    const text = decryptMessage(msg.text || "", secretKey);
    if (!text) return;
    
    setContextMenuMessage(null);
    setIsTranslating(msg.id);
    
    try {
      const translated = await translateText(text, targetLanguage);
      setTranslations(prev => ({ ...prev, [msg.id]: translated }));
    } catch (err) {
      console.error(err);
    } finally {
      setIsTranslating(null);
    }
  };

  const lastTypingSentRef = useRef<number>(0);
  const handleTyping = () => {
    if (!currentRoom || !user || currentRoom.id === 'AI_MASTER') return;

    const now = Date.now();
    // Only send typing update every 5 seconds to reduce writes
    if (now - lastTypingSentRef.current > 5000) {
      updateTypingStatus(currentRoom.id, user.uid, true);
      lastTypingSentRef.current = now;
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = window.setTimeout(() => {
      updateTypingStatus(currentRoom.id, user.uid, false);
      typingTimeoutRef.current = null;
      lastTypingSentRef.current = 0; // Reset so next stroke sends immediately
    }, 3000);
  };

  const chatMessages = currentRoom?.id === 'AI_MASTER' ? aiMessages : messages;
  const filteredMessages = chatSearchQuery.trim() 
    ? chatMessages.filter(msg => {
        const isAI = msg.isAI || msg.senderId === 'ai';
        const decryptedText = isAI ? (msg.text || "") : (msg.text ? decryptMessage(msg.text, secretKey) : "");
        return decryptedText.toLowerCase().includes(chatSearchQuery.toLowerCase());
      })
    : chatMessages;

  const renderTabContent = () => {
    switch(activeTab) {
      case 'chats':
        return (
          <>
            {[
              {
                id: 'AI_MASTER',
                name: '✨ AI Master',
                createdBy: 'system',
                createdAt: 0,
                isAI: true,
                lastMessage: aiMessages.length > 0 ? aiMessages[aiMessages.length - 1].text : "Ask me anything...",
                lastMessageAt: aiMessages.length > 0 ? aiMessages[aiMessages.length - 1].createdAt : Date.now()
              } as Room
            ].map((room) => (
                <div 
                  key={room.id}
                  onClick={() => {
                    setCurrentRoom(room);
                    setIsSidebarOpen(false);
                  }}
                  className={clsx(
                    "p-4 border-b border-white/5 cursor-pointer hover:bg-white/5 transition flex items-center gap-3",
                    currentRoom?.id === room.id ? "bg-white/10 border-l-4 border-l-master-red" : "border-l-4 border-l-transparent"
                  )}
                >
                  <div className={clsx("w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 text-lg font-bold shadow-lg", room.isAI ? "bg-master-red" : "bg-premium-blue-light")}>
                    {room.isAI ? <Bot size={24} className="text-white" /> : room.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex justify-between items-baseline mb-1">
                      <h3 className="font-semibold text-white truncate">{room.name}</h3>
                    </div>
                    <p className="text-sm text-gray-400 truncate">
                      {room.lastMessage}
                    </p>
                  </div>
                </div>
            ))}
            <div className="px-4 py-2 mt-2 text-xs font-semibold text-gray-500 uppercase tracking-widest border-t border-white/5 pt-4">
              {contactProfiles.length > 0 ? "Direct Messages" : "No Contacts Yet"}
            </div>
            {contactProfiles.map((contact) => {
              const derivedRoomId = user?.uid < contact.uid ? `${user?.uid}_${contact.uid}` : `${contact.uid}_${user?.uid}`;
              const existingRoom = rooms.find(r => r.id === derivedRoomId);
              return (
                <div 
                  key={contact.uid}
                  onClick={() => open1on1Room(contact)}
                  className={clsx(
                    "p-4 border-b border-white/5 cursor-pointer hover:bg-white/5 transition flex items-center gap-3",
                    currentRoom?.id === derivedRoomId ? "bg-white/10 border-l-4 border-l-master-red" : "border-l-4 border-l-transparent"
                  )}
                >
                  {contact.photoURL ? (
                    <img src={contact.photoURL} alt={contact.displayName} className="w-12 h-12 rounded-full border border-white/50 flex-shrink-0 object-cover shadow-sm" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 text-lg font-bold bg-premium-blue-light shadow-sm">
                      {contact.displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex justify-between items-baseline mb-1">
                      <div className="flex items-center gap-1.5 truncate flex-1">
                        <h3 className="font-semibold text-white truncate">{contact.displayName}</h3>
                        <div className="bg-master-red text-[8px] font-black text-white px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shadow-[0_0_5px_rgba(211,47,47,0.3)] border border-white/10 uppercase tracking-tighter">
                          <Check size={6} strokeWidth={4} /> {contact.uniqueId}
                        </div>
                      </div>
                      {existingRoom?.lastMessageAt && (
                        <span className="text-[10px] text-gray-500 flex-shrink-0 ml-2">
                          {format(existingRoom.lastMessageAt, 'HH:mm')}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <p className={clsx(
                        "text-sm truncate flex-1",
                        existingRoom?.lastMessageSenderId !== user?.uid && existingRoom?.lastMessageStatus !== 'seen' ? "text-white font-bold" : "text-gray-400"
                      )}>
                        {existingRoom?.lastMessage ? decryptMessage(existingRoom.lastMessage, secretKey) : "Say hi!"}
                      </p>
                      {existingRoom?.lastMessageSenderId !== user?.uid && existingRoom?.lastMessageStatus !== 'seen' && (
                        <div className="w-2.5 h-2.5 bg-master-red rounded-full shadow-[0_0_8px_rgba(211,47,47,0.8)] animate-pulse" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        );
      case 'stories':
        return (
          <div className="px-4 py-4 h-full">
             <button 
              onClick={() => setShowStoryUpload(true)}
              className="w-full mb-4 py-3 bg-premium-blue rounded-xl flex items-center justify-center gap-2 font-bold hover:bg-premium-blue-light transition"
             >
               <Plus size={20} /> Add My Status
             </button>
             <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Recent Status</h3>
             <div className="space-y-3">
               {stories.map(story => (
                 <div 
                   key={story.id} 
                   onClick={() => setViewingStory(story)}
                   className="flex items-center gap-3 p-3 bg-white/5 rounded-xl cursor-pointer hover:bg-white/10 transition"
                 >
                    <div className={clsx("w-12 h-12 rounded-full border-2 p-0.5", !story.viewers.includes(user?.uid || "") ? "border-master-red" : "border-gray-500")}>
                      {story.userPhoto ? (
                        <img src={story.userPhoto} alt={story.userName} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <div className="w-full h-full rounded-full bg-premium-blue-light flex items-center justify-center font-bold">{story.userName.charAt(0)}</div>
                      )}
                    </div>
                    <div>
                      <div className="font-semibold">{story.userName}</div>
                      <div className="text-xs text-gray-500">{format(story.createdAt, 'HH:mm')}</div>
                    </div>
                 </div>
               ))}
             </div>
          </div>
        );
      case 'ai':
        return (
          <div className="p-10 text-center flex flex-col items-center justify-center h-full">
            <Bot size={48} className="text-orange-400 mb-4 animate-bounce" />
            <h3 className="text-lg font-bold mb-2">AI Master</h3>
            <p className="text-sm text-gray-400 mb-6">Chat with our powerful AI assistant to translate, write code, or just chat.</p>
            <button 
              onClick={() => {
                setCurrentRoom({
                  id: 'AI_MASTER',
                  name: '✨ AI Master',
                  createdBy: 'system',
                  createdAt: 0,
                  isAI: true
                } as Room);
                setIsSidebarOpen(false);
              }}
              className="px-6 py-2 bg-orange-500 hover:bg-orange-600 rounded-full font-bold transition shadow-lg"
            >
              Start AI Chat
            </button>
          </div>
        );
      case 'groups':
        return (
          <div className="flex flex-col h-full bg-bg-dark/40">
             <div className="p-4 border-b border-white/10 bg-white/5 flex gap-2">
                <button 
                  onClick={() => setShowCreateGroup(true)}
                  className="flex-1 py-2 bg-master-red text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-red-700 transition"
                >
                  <Plus size={16} /> Create Group
                </button>
                <button 
                  onClick={() => setShowJoinByCode(true)}
                  className="flex-1 py-2 bg-white/10 text-white border border-white/10 rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-white/20 transition"
                >
                  <Search size={16} /> Join by ID
                </button>
             </div>
             <div className="flex-1 overflow-y-auto">
               {groups.length === 0 && <div className="p-10 text-center text-gray-500 italic text-sm">No groups joined yet. Create or join one!</div>}
               {groups.map(group => (
                 <div 
                   key={group.id}
                   onClick={() => {
                     setCurrentRoom({
                       id: group.id,
                       name: group.name,
                       type: 'group',
                       groupId: group.id,
                       participants: group.memberIds,
                       createdBy: group.adminIds[0],
                       createdAt: group.createdAt
                     });
                     setIsSidebarOpen(false);
                   }}
                   className={clsx(
                     "p-4 border-b border-white/5 cursor-pointer hover:bg-white/5 transition flex items-center gap-4",
                     currentRoom?.groupId === group.id ? "bg-white/10 border-l-4 border-l-master-red shadow-inner" : "border-l-4 border-l-transparent"
                   )}
                 >
                    <div className="w-12 h-12 rounded-2xl bg-master-red/20 border-2 border-master-red/40 flex items-center justify-center text-master-red shadow-[0_0_15px_rgba(211,47,47,0.2)]">
                       <Users size={24} />
                    </div>
                    <div className="flex-1 min-w-0 pr-2">
                       <div className="flex justify-between items-center mb-1">
                          <div className="flex items-center gap-2 overflow-hidden flex-1">
                             <h3 className="font-bold text-white truncate">{group.name}</h3>
                             {group.adminIds.includes(user?.uid || "") && (
                               <Shield size={10} className="text-master-red flex-shrink-0" title="You are admin" />
                             )}
                          </div>
                          <span className="text-[10px] font-mono text-master-red font-black bg-master-red/10 px-1.5 py-0.5 rounded border border-master-red/20 shadow-sm">#{group.uniqueId}</span>
                       </div>
                       <div className="flex justify-between items-center">
                          <p className={clsx(
                            "text-xs truncate flex-1",
                            group.lastMessageSenderId !== user?.uid && group.lastMessageStatus !== 'seen' ? "text-white font-bold" : "text-gray-400"
                          )}>
                            {group.lastMessage || group.description || "No description set"}
                          </p>
                          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                             {group.lastMessageSenderId !== user?.uid && group.lastMessageStatus !== 'seen' && (
                               <div className="w-2.5 h-2.5 bg-master-red rounded-full shadow-[0_0_8px_rgba(211,47,47,0.8)] animate-pulse" />
                             )}
                             <span className="text-[9px] text-gray-500 bg-white/5 px-2 py-0.5 rounded-full border border-white/5 whitespace-nowrap">{group.memberIds.length} members</span>
                          </div>
                       </div>
                    </div>
                 </div>
               ))}
             </div>
          </div>
        );
      case 'communities':
        return (
          <div className="flex flex-col h-full bg-[#0D1B2A]/60">
             <div className="p-4 border-b border-[#1A3A5A]/30 bg-[#1A3A5A]/20 flex gap-2">
                <button 
                  onClick={() => setShowCreateCommunity(true)}
                  className="w-full py-2 bg-premium-blue text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-premium-blue-light transition shadow-[0_0_15px_rgba(33,150,243,0.3)]"
                >
                  <Plus size={16} /> New Community
                </button>
             </div>
             <div className="flex-1 overflow-y-auto">
                <h3 className="p-4 text-[10px] font-black tracking-widest text-premium-blue-light uppercase opacity-70">Premium Communities</h3>
                {communities.length === 0 && <div className="p-10 text-center text-blue-300/40 italic text-sm">Join a community.</div>}
                {communities.map(comm => (
                  <div key={comm.id} className="mb-4 px-2">
                     <div 
                       onClick={() => {
                         setCurrentRoom({
                           id: comm.id,
                           name: `${comm.name} Announcements`,
                           type: 'announcement',
                           communityId: comm.id,
                           participants: comm.memberIds,
                           createdBy: comm.ownerId,
                           createdAt: comm.createdAt
                         });
                         setIsSidebarOpen(false);
                       }}
                       className={clsx(
                         "p-3 rounded-2xl cursor-pointer transition-all flex items-center gap-4 group border",
                         currentRoom?.communityId === comm.id 
                           ? "bg-premium-blue/10 border-premium-blue/40 shadow-lg" 
                           : "bg-white/5 border-transparent hover:bg-white/10"
                       )}
                     >
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-premium-blue to-blue-700 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                           <Shield size={24} />
                        </div>
                        <div className="flex-1 min-w-0">
                           <div className="flex justify-between items-center">
                             <h3 className="font-extrabold text-white text-base truncate flex items-center gap-2">
                               {comm.name}
                             </h3>
                             {comm.lastMessageSenderId !== user?.uid && comm.lastMessageStatus !== 'seen' && (
                               <div className="w-2.5 h-2.5 bg-premium-blue rounded-full shadow-[0_0_8px_rgba(33,150,243,0.8)] animate-pulse" />
                             )}
                           </div>
                           <p className={clsx(
                             "text-xs truncate transition-colors",
                             comm.lastMessageSenderId !== user?.uid && comm.lastMessageStatus !== 'seen' ? "text-white font-bold" : "text-gray-400"
                           )}>
                             {comm.lastMessage || comm.description || "Official announcements"}
                           </p>
                           <div className="flex items-center gap-3 mt-1">
                             <span className="text-[10px] bg-premium-blue-light/20 text-premium-blue-light px-2 py-0.5 rounded font-bold uppercase tracking-wider">{comm.memberIds.length} Members</span>
                             <span className="text-[10px] text-gray-500 font-bold">{comm.uniqueId}</span>
                           </div>
                        </div>
                     </div>
                  </div>
                ))}
             </div>
          </div>
        );
      default:
        return null;
    }
  };

  const startRecording = async () => {
    setMicError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Your browser does not support audio recording.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        audioChunksRef.current = [];
        
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }

        // Release microphone
        stream.getTracks().forEach(track => track.stop());

        // Check if we should send or if it was cancelled
        if (isRecordingCancelledRef.current) {
          setIsRecording(false);
          return;
        }

        if (recordingTimeRef.current < 1) {
          setIsRecording(false);
          return;
        }

        try {
          setIsUploading(true);
          const url = await uploadFileToStorage(audioBlob, `rooms/${currentRoom?.id}/audio/${Date.now()}.webm`);
          const { sendStructuredMessage } = await import('./lib/firestoreService');
          const userData = getCurrentUserData();
          const replyToData = getReplyToData();
          if (userData && currentRoom) {
            await sendStructuredMessage(currentRoom.id, { audioUrl: url }, `🎤 Voice message`, userData, replyToData);
            setReplyTarget(null);
          }
        } catch (error) {
          console.error("Error sending voice message:", error);
        } finally {
          setIsUploading(false);
          setIsRecording(false);
        }
      };

      recordingTimeRef.current = 0;
      setRecordingTime(0);
      mediaRecorder.start();
      setIsRecording(true);

      timerRef.current = window.setInterval(() => {
        recordingTimeRef.current += 1;
        setRecordingTime(recordingTimeRef.current);
      }, 1000);
    } catch (error: any) {
      console.error("Error accessing microphone:", error);
      let message = "Could not access microphone.";
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        message = "Microphone permission denied. Please allow it in browser settings.";
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        message = "No microphone found on your device.";
      }
      setMicError(message);
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') return;
    isRecordingCancelledRef.current = false;
    mediaRecorderRef.current.stop();
  };

  const cancelRecording = () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') return;
    isRecordingCancelledRef.current = true;
    mediaRecorderRef.current.stop();
  };

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSendImage = async () => {
    if (!currentRoom || !user || currentRoom.id === 'AI_MASTER') return;
    const url = prompt("Enter image URL:");
    if (!url) return;
    if (!secretKey) {
      alert("Please set an E2EE Secret Key first.");
      return;
    }
    const encryptedLastMessage = encryptMessage("📷 Image", secretKey);
    await sendImageMessage(currentRoom.id, url, encryptedLastMessage, {
      uid: user.uid,
      displayName: user.displayName || "Unknown",
      photoURL: user.photoURL || undefined,
    });
  };

  const TENOR_API_KEY = "L709Y8N9L8PB"; // Public demo key

  const searchGifs = async (query: string) => {
    setIsSearchingGifs(true);
    try {
      const endpoint = query === "trending" 
        ? `https://tenor.googleapis.com/v2/featured?key=${TENOR_API_KEY}&limit=20`
        : `https://tenor.googleapis.com/v2/search?q=${query}&key=${TENOR_API_KEY}&limit=20`;
      
      const res = await fetch(endpoint);
      const data = await res.json();
      setGifs(data.results || []);
    } catch (err) {
      console.error("GIF search error:", err);
    } finally {
      setIsSearchingGifs(false);
    }
  };

  const gifTimeoutRef = useRef<number | null>(null);
  const handleGifSearch = (query: string) => {
    if (gifTimeoutRef.current) clearTimeout(gifTimeoutRef.current);
    gifTimeoutRef.current = window.setTimeout(() => {
      if (query.trim()) {
        searchGifs(query);
      } else {
        searchGifs("trending");
      }
    }, 500);
  };

  const sendGif = async (url: string) => {
    if (!currentRoom || !user || currentRoom.id === 'AI_MASTER') return;
    if (!secretKey) {
      alert("Please set an E2EE Secret Key first.");
      return;
    }
    
    setShowGifPicker(false);
    setGifSearch("");
    
    const encryptedLastMessage = encryptMessage("🎬 GIF", secretKey);
    const userData = {
      uid: user.uid,
      displayName: user.displayName || "User",
      photoURL: user.photoURL || undefined
    };
    
    const replyData = replyTarget ? {
      id: replyTarget.id,
      text: replyTarget.text,
      senderName: replyTarget.senderName
    } : undefined;
    
    await sendImageMessage(currentRoom.id, url, encryptedLastMessage, userData, replyData);
    setReplyTarget(null);
  };

  if (!authInitialized) {
    return (
      <div className="min-h-screen bg-bg-dark flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <MessageCircle className="w-16 h-16 text-premium-blue-light mb-4" />
          <h1 className="text-2xl font-bold">Nameweb Chat is loading...</h1>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-bg-dark flex flex-col items-center justify-center p-4">
        <div className="bg-bg-panel p-8 rounded-2xl shadow-xl max-w-md w-full border border-white/5 backdrop-blur-xl">
          <div className="flex justify-center mb-6">
            <div className="bg-premium-blue p-4 rounded-full">
              <MessageCircle className="w-12 h-12 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-center mb-2">Nameweb Chat</h1>
          <p className="text-gray-400 text-center mb-8">Secure E2EE Real-time Messaging</p>
          <button
            onClick={() => {
              loginWithGoogle().catch((error: any) => {
                if (error.code === 'auth/popup-blocked') {
                  alert("Login popup was blocked by your browser. Please allow popups for this site, or open the app in a new tab (using the button in the top right) to sign in.");
                } else if (error.code === 'auth/unauthorized-domain') {
                  alert("This domain is not authorized for Firebase Authentication. Please follow these steps:\n\n1. Go to Firebase Console > Authentication > Settings > Authorized domains.\n2. Add '" + window.location.hostname + "' to the list.\n\nAfter adding it, wait a few seconds and try again.");
                } else if (error.code === 'auth/cancelled-popup-request') {
                  console.warn("Popup request cancelled by a subsequent request.");
                } else if (error.code !== 'auth/popup-closed-by-user') {
                  console.error(error);
                  alert(`Failed to sign in: ${error.message}`);
                }
              });
            }}
            className="w-full bg-premium-blue hover:bg-premium-blue-light text-white font-bold py-3 px-4 rounded-xl transition duration-300 flex items-center justify-center gap-2"
          >
            Sign in with Google
          </button>
          
          <div className="mt-8 text-xs text-gray-500 text-center">
            <p>Firebase Config is loaded internally. To host yourself, replace firebase-applet-config.json with your config.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-bg-dark text-white overflow-hidden font-sans">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-20 md:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Left Sidebar */}
      <div className={clsx(
        "fixed md:static inset-y-0 left-0 w-80 bg-black/40 backdrop-blur-xl border-r border-white/10 z-30 transform transition-transform duration-300 ease-in-out flex flex-col shadow-2xl",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        {/* Sidebar Header */}
        <div className="p-4 bg-transparent flex flex-col gap-3 shadow-md border-b border-white/10">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              {userProfile?.photoURL || user.photoURL ? (
                <img src={userProfile?.photoURL || user.photoURL || ""} alt="Profile" className="w-10 h-10 rounded-full border border-white/50 object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold">
                  {userProfile?.displayName?.charAt(0) || user.displayName?.charAt(0) || "U"}
                </div>
              )}
              <div className="font-semibold truncate max-w-[150px] text-white">
                <div className="flex flex-col">
                  <span className="truncate">{userProfile?.displayName || user.displayName}</span>
                  {userProfile?.bio && (
                    <span className="text-[10px] text-gray-400 font-normal italic truncate max-w-[120px]">
                      {userProfile.bio}
                    </span>
                  )}
                </div>
                {userProfile && (
                  <button 
                    onClick={() => setShowMyQr(true)}
                    className="text-[10px] font-mono font-black bg-master-red text-white px-2 py-0.5 rounded-md inline-flex items-center gap-1 mt-0.5 shadow-[0_0_12px_rgba(211,47,47,0.5)] border border-white/20 uppercase tracking-tighter hover:scale-105 active:scale-95 transition-all group" 
                    title="Verified Identity - Click for QR"
                  >
                    <Check size={8} strokeWidth={4} className="group-hover:rotate-12 transition-transform" /> 
                    <span className="mr-1">VERIFIED:</span>
                    {userProfile.uniqueId} 
                    <QrCode size={8} className="ml-1 opacity-70" />
                  </button>
                )}
              </div>
            </div>
            <div className="flex gap-1.5">
              <button 
                onClick={() => {
                  if (userProfile) {
                    setEditProfileName(userProfile.displayName);
                    setEditProfileBio(userProfile.bio || "");
                    setTargetLanguage(userProfile.preferredLanguage || "Bengali");
                    setShowProfileEdit(true);
                  }
                }}
                className="p-2 bg-white/10 text-white rounded-full hover:bg-premium-blue transition"
                title="Profile Settings"
              >
                <Smile size={18} />
              </button>
              <button onClick={() => setShowAddContact(!showAddContact)} className={clsx("p-2 rounded-full transition", showAddContact ? "bg-master-red text-white" : "bg-white/10 text-white hover:bg-white/20")} title="Add Contact">
                <UserPlus size={18} />
              </button>
              <button onClick={logout} className="p-2 bg-white/10 text-white rounded-full hover:bg-master-red transition" title="Logout">
                <LogOut size={18} />
              </button>
              <button className="md:hidden p-2 bg-white/10 text-white rounded-full" onClick={() => setIsSidebarOpen(false)}>
                <X size={18} />
              </button>
            </div>
          </div>
          
          {/* Add Contact Panel */}
          {showAddContact && (
            <div className="bg-white/5 p-3 rounded-xl border border-white/10 mt-1 animate-in fade-in slide-in-from-top-2">
              <div className="flex gap-2 mb-2">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3 top-3.5 text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="Enter ID (e.g. DB-12345)" 
                    value={searchId}
                    onChange={(e) => setSearchId(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-premium-blue text-white transition-colors"
                    maxLength={8}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchContact()}
                  />
                </div>
                <button 
                  onClick={() => setShowScanner(true)}
                  className="p-2.5 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors flex items-center justify-center border border-white/10"
                  title="Scan QR Code"
                >
                  <QrCode size={18} />
                </button>
              </div>
              <button 
                onClick={handleSearchContact} 
                disabled={isSearching || searchId.trim().length === 0}
                className="w-full bg-master-red hover:bg-red-700 text-white font-bold py-2 rounded-lg text-sm transition-all shadow-md mt-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Search
              </button>
              
              {isSearching && <div className="text-xs text-gray-400 mt-3 text-center animate-pulse">Searching...</div>}
              {showNotFound && !contactResult && !isSearching && searchId && (
                <div className="text-sm font-semibold text-master-red mt-3 text-center bg-master-red/10 py-2 rounded-lg border border-master-red/20 animate-in fade-in scale-95 duration-200">
                  {searchErrorMessage || "User not found"}
                </div>
              )}
              {contactResult && (
                <div className="mt-4 flex flex-col bg-white/10 backdrop-blur-xl p-4 rounded-xl border border-white/20 shadow-lg animate-in fade-in duration-300 zoom-in-95">
                  <div className="flex items-center gap-3 mb-4">
                     {contactResult.photoURL ? (
                       <img src={contactResult.photoURL} alt={contactResult.displayName} className="w-12 h-12 rounded-full border border-white/50 object-cover shadow-sm" referrerPolicy="no-referrer" />
                     ) : (
                       <div className="w-12 h-12 rounded-full bg-premium-blue-light flex items-center justify-center font-bold text-lg shadow-sm">{contactResult.displayName.charAt(0)}</div>
                     )}
                     <div>
                       <div className="text-base font-bold text-white leading-tight">{contactResult.displayName}</div>
                       <div className="flex items-center gap-1 mt-1">
                         <div className="text-[9px] font-mono font-black bg-master-red text-white px-1.5 py-0.5 rounded-sm flex items-center gap-0.5 uppercase tracking-tighter border border-white/10 shadow-[0_0_5px_rgba(211,47,47,0.3)]">
                           <Check size={7} strokeWidth={5} /> {contactResult.uniqueId}
                         </div>
                         <span className="text-[10px] text-gray-500 font-medium">Verified User</span>
                       </div>
                     </div>
                  </div>
                  <div className="flex gap-2">
                    {userProfile?.contacts.includes(contactResult.uid) ? (
                      <div className="flex-1 text-center py-2 bg-green-500/20 text-green-400 rounded-lg text-sm font-semibold flex items-center justify-center gap-1 border border-green-500/30">
                        <Check size={16}/> Added
                      </div>
                    ) : (
                      <button onClick={handleAddContact} className="flex-1 bg-premium-blue text-white text-sm font-semibold px-2 py-2 rounded-lg hover:bg-premium-blue-light transition-all shadow-md border border-premium-blue/50 flex items-center justify-center gap-1 hover:scale-105 active:scale-95">
                        <UserPlus size={16}/> Add to Chat
                      </button>
                    )}
                    <button onClick={() => {
                        open1on1Room(contactResult);
                        setShowAddContact(false);
                      }} className="flex-1 bg-master-red text-white text-sm font-semibold px-2 py-2 rounded-lg hover:bg-red-700 transition-all shadow-md border border-master-red/50 flex items-center justify-center gap-1 hover:scale-105 active:scale-95">
                      <MessageCircle size={16}/> Message Now
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* E2EE Key Section */}
        <div className="p-4 border-b border-white/10 bg-white/5">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-semibold uppercase text-gray-400 flex items-center gap-1">
              <Lock size={12} /> E2EE Secret Key
            </span>
            <button onClick={() => setShowKeyInput(!showKeyInput)} className="text-gray-400 hover:text-white">
              <Key size={14} />
            </button>
          </div>
          {showKeyInput ? (
            <input 
              type="password"
              value={secretKey}
              onChange={(e) => setSecretKey(e.target.value)}
              className="w-full bg-black/30 border border-white/10 rounded px-2 py-1 text-sm focus:outline-none focus:border-premium-blue"
              placeholder="Enter shared secret..."
            />
          ) : (
            <div className="text-sm bg-black/20 p-2 rounded truncate text-gray-400">
              {secretKey ? "••••••••••••..." : "No key set! Messages won't decrypt."}
            </div>
          )}
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
          {renderTabContent()}
        </div>

        {/* Tab Navigation */}
        <div className="p-2 border-t border-white/10 bg-black/40 flex justify-around items-center flex-shrink-0">
            <button 
              onClick={() => setActiveTab('chats')}
              className={clsx("p-2 rounded-xl flex flex-col items-center gap-1 transition-all flex-1", activeTab === 'chats' ? "text-premium-blue bg-premium-blue/10 scale-105" : "text-gray-500 hover:text-white")}
            >
              <MessageCircle size={20} />
              <span className="text-[10px] font-bold">Chats</span>
            </button>
            <button 
              onClick={() => setActiveTab('groups')}
              className={clsx("p-2 rounded-xl flex flex-col items-center gap-1 transition-all flex-1", activeTab === 'groups' ? "text-master-red bg-master-red/10 scale-105" : "text-gray-500 hover:text-white")}
            >
              <Users size={20} />
              <span className="text-[10px] font-bold">Groups</span>
            </button>
            <button 
              onClick={() => setActiveTab('communities')}
              className={clsx("p-2 rounded-xl flex flex-col items-center gap-1 transition-all flex-1", activeTab === 'communities' ? "text-blue-400 bg-blue-400/10 scale-105" : "text-gray-500 hover:text-white")}
            >
              <Shield size={20} />
              <span className="text-[10px] font-bold">Comm.</span>
            </button>
            <button 
              onClick={() => setActiveTab('stories')}
              className={clsx("p-2 rounded-xl flex flex-col items-center gap-1 transition-all flex-1", activeTab === 'stories' ? "text-purple-400 bg-purple-400/10 scale-105" : "text-gray-500 hover:text-white")}
            >
              <Smile size={20} />
              <span className="text-[10px] font-bold">Status</span>
            </button>
            <button 
              onClick={() => setActiveTab('ai')}
              className={clsx("p-2 rounded-xl flex flex-col items-center gap-1 transition-all flex-1", activeTab === 'ai' ? "text-orange-400 bg-orange-400/10 scale-105" : "text-gray-500 hover:text-white")}
            >
              <Bot size={20} />
              <span className="text-[10px] font-bold">AI</span>
            </button>
        </div>
      </div>

      {/* My QR Modal */}
      {showMyQr && userProfile && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-bg-panel border border-white/10 p-8 rounded-3xl max-w-xs w-full flex flex-col items-center shadow-2xl relative">
            <button 
              onClick={() => setShowMyQr(false)}
              className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
            <div className="bg-white p-4 rounded-2xl mb-6 shadow-[0_0_20px_rgba(255,255,255,0.1)]">
              <QRCodeSVG 
                value={userProfile.uniqueId} 
                size={200}
                level="H"
                includeMargin={false}
                imageSettings={{
                  src: "/favicon.ico",
                  x: undefined,
                  y: undefined,
                  height: 40,
                  width: 40,
                  excavate: true,
                }}
              />
            </div>
            <h3 className="text-xl font-bold mb-1">{user.displayName}</h3>
            <div className="text-xs font-mono font-black bg-master-red text-white px-3 py-1 rounded-md inline-flex items-center gap-1.5 uppercase shadow-lg border border-white/10">
              <Check size={12} strokeWidth={4} /> 
              <span className="opacity-80">VERIFIED:</span>
              {userProfile.uniqueId}
            </div>
            <p className="text-xs text-gray-500 mt-6 text-center leading-relaxed">
              Show this QR to your friends<br/>to let them add you instantly.
            </p>
          </div>
        </div>
      )}

      {/* QR Scanner Modal */}
      {showScanner && (
        <QrScannerModal 
          onClose={() => setShowScanner(false)} 
          onScan={handleQrScan} 
        />
      )}

      {/* Right Main Chat Window */}
      <div className="flex-1 flex flex-col h-full relative bg-transparent">
        {/* Chat Header */}
        <div className="h-20 bg-black/30 backdrop-blur-xl border-b border-white/10 flex items-center px-6 flex-shrink-0 z-10 shadow-sm relative">
          <button className="mr-4 md:hidden p-2 rounded-lg hover:bg-white/10" onClick={() => setIsSidebarOpen(true)}>
            <Menu size={24} className="text-white" />
          </button>
          
          {currentRoom ? (
            <>
              <div 
                className="flex items-center gap-4 cursor-pointer"
                onClick={() => {
                  if (currentRoom.type === 'group') {
                    setShowGroupProfile(true);
                  } else if (currentRoom.type === '1on1' || !currentRoom.type) {
                    const otherParticipantId = currentRoom.participants?.find(p => p !== user?.uid);
                    const contactProfile = contactProfiles.find(c => c.uid === otherParticipantId);
                    if (contactProfile) setViewingUserProfile(contactProfile);
                  }
                }}
              >
                {currentRoom.isAI ? (
                  <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold shadow-lg overflow-hidden bg-master-red">
                    <Bot size={24} className="text-white" />
                  </div>
                ) : currentRoom.type === 'group' ? (
                  <div className="w-12 h-12 rounded-2xl bg-master-red/20 border-2 border-master-red/40 flex items-center justify-center text-master-red shadow-[0_0_15px_rgba(211,47,47,0.2)]">
                     <Users size={24} />
                  </div>
                ) : currentRoom.type === 'announcement' ? (
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-premium-blue to-blue-700 flex items-center justify-center text-white shadow-lg">
                     <Shield size={24} />
                  </div>
                ) : (
                  (() => {
                    const otherParticipantId = currentRoom.participants?.find(p => p !== user?.uid);
                    const contactProfile = contactProfiles.find(c => c.uid === otherParticipantId);
                    
                    if (contactProfile?.photoURL) {
                      return <img src={contactProfile.photoURL} alt={currentRoom.name} className="w-12 h-12 rounded-full border border-white/50 object-cover shadow-sm" referrerPolicy="no-referrer" />;
                    }
                    return (
                      <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold shadow-lg overflow-hidden bg-premium-blue">
                        <span className="text-white text-lg">{currentRoom.name.charAt(0).toUpperCase()}</span>
                      </div>
                    );
                  })()
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-lg text-white">{currentRoom.name}</h2>
                    {currentRoom.type === 'group' ? (
                      <div className="flex items-center gap-2">
                         <div className="bg-master-red text-[8px] font-black text-white px-1.5 py-0.5 rounded-full uppercase tracking-tighter shadow-sm border border-white/10">Group</div>
                         <span className="text-[10px] text-gray-400">{currentRoom.participants?.length || 0} members</span>
                      </div>
                    ) : (
                      !currentRoom.isAI && ((() => {
                        const otherParticipantId = currentRoom.participants?.find(p => p !== user?.uid);
                        const contactProfile = contactProfiles.find(c => c.uid === otherParticipantId);
                        if (contactProfile) {
                          return (
                            <div className="bg-master-red text-[9px] font-black text-white px-2 py-0.5 rounded-md flex items-center gap-1 shadow-[0_0_8px_rgba(211,47,47,0.4)] border border-white/10 uppercase tracking-tighter">
                              <Check size={8} strokeWidth={4} /> {contactProfile.uniqueId}
                            </div>
                          );
                        }
                        return null;
                      })())
                    )}
                  </div>
                  <div className="text-xs text-green-400 flex items-center gap-1 font-medium mt-0.5">
                    <Lock size={12} /> {currentRoom.isAI ? "Secured Connection" : "End-to-End Encrypted"}
                  </div>
                </div>
              </div>
              
              <div className="ml-auto flex items-center gap-2">
                {showChatSearch && (
                  <div className="relative animate-in slide-in-from-right-4 duration-300">
                    <input 
                      autoFocus
                      type="text"
                      placeholder="Search messages..."
                      value={chatSearchQuery}
                      onChange={(e) => setChatSearchQuery(e.target.value)}
                      className="bg-white/5 border border-white/10 rounded-full px-4 py-1.5 text-sm w-40 sm:w-64 focus:outline-none focus:border-premium-blue text-white"
                    />
                    <button 
                      onClick={() => {
                        setShowChatSearch(false);
                        setChatSearchQuery("");
                      }}
                      className="absolute right-3 top-2 text-gray-500 hover:text-white"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
                {!showChatSearch && (
                  <button 
                    onClick={() => setShowChatSearch(true)}
                    className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"
                    title="Search Messages"
                  >
                    <Search size={20} />
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <div className="bg-premium-blue p-2 rounded-lg">
                <MessageCircle className="text-white" size={24} />
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-white">Nameweb.</h2>
            </div>
          )}
        </div>

        {/* Message Area */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar relative">
          {currentRoom ? (
            filteredMessages.length === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500">
                {chatSearchQuery ? (
                  <div className="flex flex-col items-center justify-center animate-in fade-in zoom-in-95 duration-300">
                    <Search size={48} className="mb-4 opacity-10 text-white" />
                    <p className="text-lg font-semibold text-gray-400">No results found</p>
                    <p className="text-sm text-gray-600 mt-1">Try a different keyword</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-center">
                    {currentRoom.isAI ? (
                        <Bot size={48} className="mb-4 opacity-20 text-master-red" />
                    ) : (
                        <MessageCircle size={48} className="mb-4 opacity-20 text-premium-blue" />
                    )}
                    <p>Welcome to {currentRoom.name}</p>
                    <p className="text-sm mt-2 max-w-sm">
                      {currentRoom.isAI ? "Ask AI Master anything. Powered by Gemini API." : "Messages are encrypted with your Secret Key. Only people with the key can read them."}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-4 max-w-4xl mx-auto w-full pb-4">
                {filteredMessages.map((msg) => {
                  const isMine = msg.senderId === user.uid;
                  const isAI = msg.isAI || msg.senderId === 'ai';
                  const decryptedText = isAI ? (msg.text || "") : (msg.text ? decryptMessage(msg.text, secretKey) : "");

                  const highlightText = (text: string, query: string) => {
                    if (!query.trim()) return <span>{text}</span>;
                    const parts = text.split(new RegExp(`(${query})`, "gi"));
                    return (
                      <span>
                        {parts.map((part, i) => 
                          part.toLowerCase() === query.toLowerCase() 
                            ? <mark key={i} className="bg-yellow-500/40 text-white rounded-sm px-0.5">{part}</mark> 
                            : part
                        )}
                      </span>
                    );
                  };

                  return (
                    <div key={msg.id} className={clsx("flex flex-col relative", isMine ? "items-end" : "items-start")}>
                      {/* Swipe Background Reply Icon */}
                      <div className="absolute left-6 top-1/2 -translate-y-1/2 opacity-20 pointer-events-none">
                        <MessageCircle size={24} className="text-master-red" />
                      </div>

                      <div className="flex items-center gap-2 mb-1 px-1">
                        {!isMine && (
                          <>
                            {msg.senderPhotoURL ? (
                              <img src={msg.senderPhotoURL} alt="" className="w-5 h-5 rounded-full object-cover border border-white/20" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-premium-blue-light flex items-center justify-center text-[10px] font-bold">
                                {msg.senderName?.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <span className="text-xs font-bold text-premium-blue-light">{msg.senderName}</span>
                            <span className="text-gray-600 text-[10px]">•</span>
                          </>
                        )}
                        <span className="text-[10px] text-gray-500">
                          {typeof (msg.createdAt) === 'number' ? format(msg.createdAt, 'HH:mm') : '...'}
                        </span>
                      </div>
                      
                      {/* Reaction Floating Bar */}
                      {activeReactionMessageId === msg.id && (
                        <div className={clsx(
                          "absolute top-[-36px] z-20 flex gap-1 bg-[#1A2332]/90 backdrop-blur-xl border border-premium-blue/40 px-2 py-1 rounded-full shadow-lg animate-in slide-in-from-bottom-2",
                          isMine ? "right-0" : "left-0"
                        )}>
                          {['👍', '❤️', '😂', '😮', '😢', '🔥'].map(emoji => (
                            <button
                              key={emoji}
                              onClick={(e) => {
                                e.stopPropagation();
                                addReaction(currentRoom.id, msg.id, emoji, user.uid);
                                setActiveReactionMessageId(null);
                              }}
                              className="w-8 h-8 flex items-center justify-center text-lg hover:bg-white/10 rounded-full transition transform hover:scale-125"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Click outside to close reaction bar */}
                      {activeReactionMessageId === msg.id && (
                         <div className="fixed inset-0 z-10" onClick={() => setActiveReactionMessageId(null)} />
                      )}

                      <div 
                        onContextMenu={(e) => {
                          e.preventDefault();
                          if (currentRoom.id !== 'AI_MASTER') {
                            setContextMenuMessage(msg);
                            // Also show reaction picker? User might want it together.
                            // I'll just show my more comprehensive menu for now.
                          }
                        }}
                        onTouchStart={(e) => onTouchStart(e, msg)}
                        onTouchMove={(e) => onTouchMove(e, msg)}
                        onTouchEnd={(e) => onTouchEnd(e, msg)}
                        className={clsx(
                        "relative max-w-[85%] sm:max-w-[70%] px-4 py-2.5 rounded-2xl shadow-sm text-[15px] leading-relaxed break-words select-none transition-transform",
                        isMine 
                          ? "bg-premium-blue/90 border border-premium-blue-light/50 text-white rounded-br-sm glassmorphism" 
                          : isAI
                            ? "bg-premium-blue/20 backdrop-blur-xl border border-premium-blue-light/30 shadow-[0_4px_30px_rgba(26,35,126,0.3)] text-white rounded-bl-sm glassmorphism"
                            : "bg-white/10 backdrop-blur-md border border-white/10 text-gray-100 rounded-bl-sm glassmorphism",
                        activeReactionMessageId === msg.id && "scale-[1.02]"
                      )}>
                        {/* Reply To Context */}
                        {msg.replyTo && (
                          <div className="mb-2 bg-black/20 border-l-2 border-master-red rounded overflow-hidden shadow-inner flex items-stretch">
                            <div className="flex-1 p-2 min-w-0">
                               <div className="flex items-center gap-1.5 mb-0.5">
                                 <div className="text-[9px] font-black text-master-red uppercase tracking-tighter opacity-70">
                                   Reply to
                                 </div>
                                 <div className="text-[11px] font-bold text-white/90 truncate">
                                   {msg.replyTo.senderName}
                                 </div>
                               </div>
                               <div className="text-[11px] text-white/60 truncate italic pl-1 border-l border-white/5">
                                 {msg.replyTo.imageUrl ? "📷 Image" : msg.replyTo.text}
                               </div>
                            </div>
                          </div>
                        )}

                        {msg.imageUrl && (
                           <img src={msg.imageUrl} alt="Shared" className="rounded-md max-h-60 object-cover mb-1" referrerPolicy="no-referrer" />
                        )}
                        {msg.fileUrl && msg.fileName && (
                           <DocumentWidget url={msg.fileUrl} name={msg.fileName} />
                        )}
                        {msg.location && (
                           <LocationWidget lat={msg.location.lat} lng={msg.location.lng} />
                        )}
                        {msg.pollId && (
                           <PollWidget roomId={currentRoom.id} pollId={msg.pollId} currentUserId={user.uid} />
                        )}
                        {msg.event && (
                           <EventWidget title={msg.event.title} date={msg.event.date} time={msg.event.time} />
                        )}
                        {msg.audioUrl && (
                           <AudioWidget url={msg.audioUrl} />
                        )}
                        {decryptedText && !msg.pollId && !msg.location && !msg.event && !msg.fileUrl && !msg.imageUrl && !msg.audioUrl && (
                           <div className="space-y-2">
                             {highlightText(decryptedText, chatSearchQuery)}
                             {(translations[msg.id] || isTranslating === msg.id) && (
                               <div className="pt-2 border-t border-white/10 mt-2">
                                 {isTranslating === msg.id ? (
                                   <div className="flex items-center gap-2 text-xs opacity-70 animate-pulse">
                                     <Languages size={12} />
                                     <span>Translating...</span>
                                   </div>
                                 ) : (
                                   <div className="text-sm italic opacity-90 relative pl-6">
                                     <Languages size={12} className="absolute left-0 top-1 text-yellow-500" />
                                     {translations[msg.id]}
                                   </div>
                                 )}
                               </div>
                             )}
                           </div>
                        )}

                        <div className="flex items-center justify-end gap-1 mt-1 opacity-70">
                          {isMine && currentRoom.id !== 'AI_MASTER' && (
                             <div className="flex items-center gap-1">
                                {(!msg.seenBy || msg.seenBy.length <= 1) ? (
                                  <Check size={12} strokeWidth={3} className="text-white/60" />
                                ) : (
                                  <CheckCheck 
                                    size={12} 
                                    strokeWidth={3} 
                                    className={(currentRoom.participants && msg.seenBy.length >= currentRoom.participants.length) 
                                      ? "text-[#4FC3F7]" 
                                      : "text-white/60"} 
                                  />
                                )}
                                {currentRoom.participants && currentRoom.participants.length > 2 && msg.seenBy && msg.seenBy.length > 1 && (
                                  <span className="text-[9px] font-bold">
                                    {msg.seenBy.length - 1}
                                  </span>
                                )}
                             </div>
                          )}
                        </div>
                        
                        {/* Display Reactions */}
                        {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                          <div className={clsx(
                            "absolute bottom-[-14px] flex px-1.5 py-0.5 bg-[#1A2332] border border-white/10 rounded-full shadow-sm text-sm gap-0.5 z-10",
                            isMine ? "right-2" : "left-2"
                          )}>
                            {Array.from(new Set(Object.values(msg.reactions))).slice(0, 3).map((emoji, i) => (
                              <span key={i}>{emoji as string}</span>
                            ))}
                            {Object.keys(msg.reactions).length > 3 && (
                              <span className="text-gray-400 font-medium ml-0.5 mt-0.5 text-[10px]">+{Object.keys(msg.reactions).length - 3}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {isAITyping && currentRoom?.id === 'AI_MASTER' && (
                  <div className="flex flex-col items-start">
                    <div className="bg-[#1E293B]/80 backdrop-blur-xl border border-master-red px-4 py-3 rounded-2xl rounded-bl-sm flex gap-1 glassmorphism text-xs font-bold text-master-red items-center">
                      AI Master is typing
                      <div className="flex gap-1 ml-1 transform translate-y-0.5">
                        <span className="w-1 h-1 rounded-full bg-master-red animate-bounce" style={{animationDelay: '0ms'}}></span>
                        <span className="w-1 h-1 rounded-full bg-master-red animate-bounce" style={{animationDelay: '150ms'}}></span>
                        <span className="w-1 h-1 rounded-full bg-master-red animate-bounce" style={{animationDelay: '300ms'}}></span>
                      </div>
                    </div>
                  </div>
                )}
                {typingUsers.length > 0 && (
                  <div className="flex flex-col items-start animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="bg-white/5 backdrop-blur-md border border-white/10 px-4 py-2 rounded-2xl rounded-bl-sm flex items-center gap-2 text-xs font-medium text-gray-400">
                      <div className="flex gap-1">
                        <span className="w-1 h-1 rounded-full bg-premium-blue animate-bounce" style={{animationDelay: '0ms'}}></span>
                        <span className="w-1 h-1 rounded-full bg-premium-blue animate-bounce" style={{animationDelay: '150ms'}}></span>
                        <span className="w-1 h-1 rounded-full bg-premium-blue animate-bounce" style={{animationDelay: '300ms'}}></span>
                      </div>
                      <span>
                        {typingUsers.length === 1 
                          ? `${contactProfiles.find(p => p.uid === typingUsers[0])?.displayName || "Someone"} is typing...`
                          : `${typingUsers.length} people are typing...`}
                      </span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500 flex-col">
              <div className="w-24 h-24 rounded-full bg-premium-blue/20 flex flex-col items-center justify-center mb-6 border border-premium-blue/30 backdrop-blur">
                <MessageCircle size={40} className="text-premium-blue" />
              </div>
              <p className="text-xl">Select a chat to start messaging</p>
            </div>
          )}
        </div>

        {/* Message Input */}
        {currentRoom && (
          <div className="p-4 bg-black/40 backdrop-blur-xl border-t border-white/10 relative">
            {(micError || cameraError) && (
              <div className="absolute bottom-[calc(100%+8px)] left-4 right-4 p-3 bg-master-red/90 text-white text-xs text-center rounded-xl border border-white/20 flex items-center justify-between gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300 z-50 shadow-xl backdrop-blur-md">
                <div className="flex items-center gap-2">
                  <div className="bg-white/20 p-1 rounded-full">
                    {micError ? <Mic size={14} /> : <ImageIcon size={14} />}
                  </div>
                  <span className="font-medium">{micError || cameraError}</span>
                </div>
                <button 
                  onClick={() => {
                    setMicError(null);
                    setCameraError(null);
                  }} 
                  className="p-1 hover:bg-white/20 rounded-full transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            )}
            {isUploading && (
              <div className="absolute top-0 left-0 right-0 h-1 bg-premium-blue/20">
                <div className="h-full bg-premium-blue animate-pulse"></div>
              </div>
            )}
            <AttachmentMenu isOpen={showAttachmentMenu} onClose={() => setShowAttachmentMenu(false)} onAction={handleAttachmentAction} />
            
            {/* Reply Preview Above Input */}
            {replyTarget && (
              <div className="max-w-4xl mx-auto mb-2 bg-[#1A2332]/90 border border-white/10 rounded-2xl overflow-hidden glassmorphism animate-in slide-in-from-bottom-2 duration-300 shadow-2xl">
                <div className="flex items-stretch">
                  <div className="w-1.5 bg-master-red" />
                  <div className="flex-1 p-3 min-w-0 pr-10 relative">
                    <div className="flex items-center gap-2 mb-1">
                      <MessageCircle size={12} className="text-master-red" />
                      <span className="text-[10px] uppercase tracking-widest font-black text-master-red opacity-80">Replying to</span>
                      <span className="text-xs font-bold text-white truncate">{replyTarget.senderName}</span>
                    </div>
                    <div className="text-sm text-gray-400 truncate italic">
                      " {replyTarget.imageUrl ? "📷 Image" : (replyTarget.text ? decryptMessage(replyTarget.text, secretKey) : "Media Content")} "
                    </div>
                    
                    <button 
                      onClick={() => setReplyTarget(null)}
                      className="absolute right-2 top-2 p-1.5 hover:bg-white/10 rounded-full transition-colors text-white/50 hover:text-white"
                      title="Cancel Reply"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Smart Replies */}
            {smartReplies.length > 0 && currentRoom.id !== 'AI_MASTER' && (
              <div className="max-w-4xl mx-auto flex gap-2 mb-3 overflow-x-auto pb-1 scrollbar-hide">
                {smartReplies.map((reply, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setNewMessage(reply);
                      // Let user press send or we could send it directly.
                      // Usually "Smart Reply" chips tap to insert or tap to send. We'll just insert.
                    }}
                    className="whitespace-nowrap px-4 py-1.5 bg-premium-blue/40 hover:bg-premium-blue/80 border border-premium-blue text-white rounded-full text-sm font-medium transition cursor-pointer backdrop-blur-md shadow-sm"
                  >
                    {reply}
                  </button>
                ))}
              </div>
            )}

            <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto flex gap-2 relative items-center">
              {currentRoom.id !== 'AI_MASTER' && (
                <div className="relative">
                  <button 
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className={clsx("w-12 h-12 rounded-full flex items-center justify-center transition-all disabled:opacity-50 flex-shrink-0 hover:bg-white/10 hover:text-white", showEmojiPicker ? "bg-white/20 text-white" : "bg-transparent text-gray-400")}
                    title="Emoji"
                  >
                    <Smile size={24} />
                  </button>
                  
                  {showEmojiPicker && (
                    <div className="absolute bottom-[calc(100%+8px)] left-0 bg-[#1A2332] border border-white/10 p-3 rounded-2xl shadow-2xl z-50 w-64 glassmorphism animate-in fade-in slide-in-from-bottom-2 duration-200">
                      <div className="grid grid-cols-6 gap-2">
                        {['😊', '😂', '🥰', '😍', '😒', '😭', '😱', '😡', '👍', '👎', '❤️', '🔥', '✨', '🎉', '🙏', '💯', '🤔', '😎'].map(emoji => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => {
                              setNewMessage(prev => prev + emoji);
                              setShowEmojiPicker(false);
                            }}
                            className="text-2xl hover:scale-125 transition-transform p-1"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                      <div className="mt-3 pt-2 border-t border-white/5 text-[10px] text-center text-gray-500 uppercase tracking-widest font-black">
                        Quick React
                      </div>
                    </div>
                  )}
                </div>
              )}
              {currentRoom.id !== 'AI_MASTER' && (
                <div className="relative">
                  <button 
                    type="button"
                    onClick={() => {
                      if (!showGifPicker) searchGifs("trending");
                      setShowGifPicker(!showGifPicker);
                      setShowEmojiPicker(false);
                      setShowAttachmentMenu(false);
                    }}
                    className={clsx("w-12 h-12 rounded-full flex items-center justify-center transition-all disabled:opacity-50 flex-shrink-0 hover:bg-white/10 hover:text-white -ml-2", showGifPicker ? "bg-white/20 text-white" : "bg-transparent text-gray-400")}
                    title="GIFs"
                  >
                    <Sticker size={22} />
                  </button>
                  
                  {showGifPicker && (
                    <div className="absolute bottom-[calc(100%+8px)] left-0 bg-[#1A2332] border border-white/10 p-3 rounded-2xl shadow-2xl z-50 w-72 h-80 flex flex-col glassmorphism animate-in fade-in slide-in-from-bottom-2 duration-200">
                      <div className="flex gap-2 mb-3">
                        <input 
                          autoFocus
                          type="text" 
                          placeholder="Search Tenor..." 
                          value={gifSearch}
                          onChange={(e) => {
                            setGifSearch(e.target.value);
                            handleGifSearch(e.target.value);
                          }}
                          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-sm text-white focus:outline-none focus:border-premium-blue"
                        />
                      </div>
                      <div className="flex-1 overflow-y-auto grid grid-cols-2 gap-2 scrollbar-thin">
                        {isSearchingGifs ? (
                          <div className="col-span-2 flex items-center justify-center py-10">
                            <div className="w-6 h-6 border-2 border-premium-blue border-t-transparent rounded-full animate-spin" />
                          </div>
                        ) : gifs.map(gif => (
                          <button
                            key={gif.id}
                            type="button"
                            onClick={() => sendGif(gif.media_formats.tinygif.url)}
                            className="aspect-video rounded-lg overflow-hidden hover:opacity-80 transition-opacity bg-white/5"
                          >
                            <img src={gif.media_formats.tinygif.url} alt="GIF" className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                      <div className="mt-2 text-[8px] text-right text-gray-500 uppercase tracking-widest font-black">
                        Powered by Tenor
                      </div>
                    </div>
                  )}
                </div>
              )}
              {currentRoom.id !== 'AI_MASTER' && (
                <button 
                  type="button"
                  onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                  className={clsx("w-12 h-12 rounded-full flex items-center justify-center transition-all disabled:opacity-50 flex-shrink-0 -ml-2", showAttachmentMenu ? "bg-white/20 text-white" : "bg-transparent text-gray-400 hover:bg-white/10 hover:text-white")}
                  title="Attach"
                >
                  <Paperclip size={22} className={clsx(showAttachmentMenu && "-rotate-45 transition-transform")} />
                </button>
              )}
              <div className="flex-1 relative flex items-center">
                {isRecording ? (
                  <div className="flex-1 flex items-center justify-between bg-[#1A2332]/50 border border-master-red/50 rounded-3xl px-5 py-3 shadow-inner overflow-hidden">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-master-red animate-pulse shadow-[0_0_8px_rgba(211,47,47,0.8)]" />
                      <div className="text-white font-mono text-sm tracking-wide">
                        {formatRecordingTime(recordingTime)}
                      </div>
                      <div className="flex items-center space-x-1 h-4 ml-4 opacity-70">
                         {/* Simple visualizer bars */}
                         {[1,2,3,4,5].map(i => (
                           <div key={i} className="w-1 bg-master-red rounded-full animate-pulse audio-wave" style={{height: `${Math.max(20, Math.random() * 100)}%`, animationDelay: `${i * 0.1}s`}} />
                         ))}
                      </div>
                    </div>
                    <button type="button" onClick={cancelRecording} className="text-gray-400 hover:text-white uppercase text-xs font-bold tracking-wider">
                      Cancel
                    </button>
                  </div>
                ) : (
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => {
                      setNewMessage(e.target.value);
                      handleTyping();
                    }}
                    placeholder={currentRoom.id === 'AI_MASTER' ? "Ask AI Master anything..." : "Message"}
                    className="w-full bg-[#1A2332]/50 border border-white/10 rounded-3xl pl-5 pr-4 py-3 focus:outline-none focus:border-premium-blue focus:ring-1 focus:ring-premium-blue text-white placeholder-gray-500 shadow-inner"
                  />
                )}
              </div>
              {newMessage.trim() && !isRecording ? (
                <button 
                  type="submit" 
                  className="w-12 h-12 bg-premium-blue hover:bg-blue-700 text-white rounded-full flex items-center justify-center transition-all shadow-lg transform hover:scale-105 active:scale-95 flex-shrink-0"
                >
                   <Send size={20} className="translate-x-0.5" />
                </button>
              ) : (
                <button 
                   type="button" 
                   onClick={isRecording ? stopRecording : startRecording}
                   className={clsx("w-12 h-12 text-white rounded-full flex items-center justify-center transition-all shadow-lg transform hover:scale-105 active:scale-95 flex-shrink-0 relative overflow-hidden", isRecording ? "bg-white text-master-red" : "bg-master-red hover:bg-red-700")}
                >
                   {isRecording && <div className="absolute inset-0 bg-master-red/20 animate-ping rounded-full" />}
                   {isRecording ? <Send size={20} className="translate-x-0.5 text-master-red" /> : <Mic size={22} />}
                </button>
              )}
            </form>
          </div>
        )}
      </div>
      {showPollModal && <PollModal onClose={() => setShowPollModal(false)} onSubmit={handleCreatePoll} />}
      {showEventModal && <EventModal onClose={() => setShowEventModal(false)} onSubmit={handleCreateEvent} />}
      
      {showStoryUpload && user && (
        <StoryUploadModal 
          onClose={() => setShowStoryUpload(false)} 
          onSubmit={async (url, text) => {
            await addStory(user, url, text);
          }} 
        />
      )}

      {/* Create Group Modal */}
      {showCreateGroup && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[150] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-[#1A2332] border border-white/10 rounded-3xl w-full max-w-md shadow-2xl p-6 glassmorphism">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold flex items-center gap-2">
                <Users className="text-master-red" />
                Create Group
              </h3>
              <button onClick={() => setShowCreateGroup(false)} className="p-2 hover:bg-white/10 rounded-full">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] uppercase font-black text-gray-500 tracking-widest block mb-1">Group Name</label>
                <input 
                  type="text" 
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-master-red"
                  placeholder="The Squad"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-black text-gray-500 tracking-widest block mb-1">Select Contacts</label>
                <div className="max-h-48 overflow-y-auto space-y-2 custom-scrollbar bg-black/20 p-3 rounded-xl border border-white/5">
                  {contactProfiles.map(contact => (
                    <div 
                      key={contact.uid} 
                      onClick={() => {
                        if (selectedContactsForGroup.includes(contact.uid)) {
                          setSelectedContactsForGroup(prev => prev.filter(uid => uid !== contact.uid));
                        } else {
                          setSelectedContactsForGroup(prev => [...prev, contact.uid]);
                        }
                      }}
                      className={clsx(
                        "p-3 rounded-lg flex items-center justify-between cursor-pointer transition",
                        selectedContactsForGroup.includes(contact.uid) ? "bg-master-red/20 border border-master-red/50" : "bg-white/5 border border-transparent hover:bg-white/10"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-premium-blue-light flex items-center justify-center font-bold text-xs">{contact.displayName.charAt(0)}</div>
                        <span className="font-medium text-sm">{contact.displayName}</span>
                      </div>
                      {selectedContactsForGroup.includes(contact.uid) && <Check size={16} className="text-master-red" />}
                    </div>
                  ))}
                </div>
              </div>
              <button 
                onClick={handleCreateGroup}
                disabled={!groupName.trim() || selectedContactsForGroup.length === 0}
                className="w-full py-4 bg-master-red hover:bg-red-700 text-white rounded-xl font-bold shadow-lg transition-all disabled:opacity-50"
              >
                Create Group
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Join Group Modal */}
      {showJoinByCode && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[150] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-[#1A2332] border border-white/10 rounded-3xl w-full max-w-sm shadow-2xl p-6 glassmorphism">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold flex items-center gap-2">
                <Search className="text-premium-blue" />
                Join Group
              </h3>
              <button onClick={() => setShowJoinByCode(false)} className="p-2 hover:bg-white/10 rounded-full">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <input 
                type="text" 
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-4 text-center text-2xl font-black tracking-[0.5em] text-white focus:outline-none focus:border-premium-blue"
                placeholder="12345"
                maxLength={5}
              />
              <p className="text-xs text-center text-gray-500">Enter the 5-digit unique ID to join the group.</p>
              <button 
                onClick={handleJoinByCode}
                disabled={joinCode.length !== 5}
                className="w-full py-4 bg-premium-blue hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg transition-all disabled:opacity-50"
              >
                Join Group
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Group Profile Modal */}
      {showGroupProfile && currentRoom?.groupId && (
        (() => {
          const group = groups.find(g => g.id === currentRoom.groupId);
          if (!group) return null;
          return (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[150] flex items-center justify-center p-4 animate-in fade-in duration-300">
              <div className="bg-[#1A2332] border border-white/10 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden glassmorphism max-h-[90vh] flex flex-col">
                <div className="relative h-48 bg-gradient-to-br from-master-red to-red-900 flex flex-col items-center justify-center p-6 text-center">
                  <button 
                    onClick={() => setShowGroupProfile(false)} 
                    className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 rounded-full transition"
                  >
                    <X size={20} />
                  </button>
                  <div className="w-20 h-20 rounded-3xl bg-white/10 border border-white/20 flex items-center justify-center text-white mb-3 shadow-xl">
                    <Users size={40} />
                  </div>
                  <h3 className="text-2xl font-black text-white">{group.name}</h3>
                  <div className="text-xs font-mono bg-black/30 px-3 py-1 rounded-full border border-white/10 mt-2">ID: {group.uniqueId}</div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
                  <div className="mb-6">
                    <label className="text-[10px] uppercase font-black text-gray-500 tracking-widest block mb-2">Description</label>
                    <p className="text-sm text-gray-300 italic">{group.description || "No description set for this group."}</p>
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <label className="text-[10px] uppercase font-black text-gray-500 tracking-widest">Members ({group.memberIds.length})</label>
                      {group.adminIds.includes(user?.uid || "") && (
                        <div className="flex flex-col gap-2 w-full max-w-[200px]">
                          <div className="flex gap-1">
                            <input 
                              type="text" 
                              placeholder="Email or ID"
                              value={groupInviteSearch}
                              onChange={(e) => setGroupInviteSearch(e.target.value)}
                              className="flex-1 bg-black/20 border border-white/10 rounded px-2 py-1.5 text-[10px] focus:outline-none focus:border-master-red transition-colors"
                            />
                            <button 
                              onClick={handleGroupInviteSearch}
                              className="bg-master-red text-[8px] font-black uppercase text-white px-3 py-1.5 rounded-lg active:scale-95 transition-all shadow-lg"
                            >
                              Search
                            </button>
                          </div>
                          {groupInviteResults.length > 0 && (
                            <div className="bg-black/60 border border-white/10 rounded-xl p-1.5 space-y-1 animate-in fade-in slide-in-from-top-1">
                              {groupInviteResults.map(r => (
                                <div key={r.uid} className="flex items-center justify-between gap-2 p-1.5 hover:bg-white/5 rounded-lg transition-colors">
                                  <div className="flex items-center gap-2 overflow-hidden">
                                     {r.photoURL ? <img src={r.photoURL} className="w-5 h-5 rounded-full object-cover" /> : <div className="w-5 h-5 rounded-full bg-premium-blue flex items-center justify-center text-[8px]">{r.displayName.charAt(0)}</div>}
                                     <span className="text-[10px] truncate text-white">{r.displayName}</span>
                                  </div>
                                  {!group.memberIds.includes(r.uid) ? (
                                    <button onClick={() => handleAddMemberToGroup(r.uid)} className="bg-premium-blue text-[8px] px-2 py-1 rounded font-bold hover:bg-blue-600 transition-colors">Add</button>
                                  ) : (
                                    <span className="text-[8px] text-gray-500 font-bold px-2">Member</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="space-y-3">
                      {group.memberIds.map(mid => {
                        const mProfile = groupMembers.find(p => p.uid === mid) || (mid === user?.uid ? userProfile : null);
                        const isAdmin = group.adminIds.includes(mid);
                        return (
                          <div key={mid} className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors group/member">
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                {mProfile?.photoURL ? (
                                  <img src={mProfile.photoURL} alt="" className="w-10 h-10 rounded-full object-cover border border-white/10" referrerPolicy="no-referrer" />
                                ) : (
                                  <div className="w-10 h-10 rounded-full bg-premium-blue-light flex items-center justify-center font-bold text-sm text-white">{(mProfile?.displayName || "U").charAt(0)}</div>
                                )}
                                {isAdmin && (
                                  <div className="absolute -top-1 -right-1 bg-master-red rounded-full p-1 border-2 border-[#1A2332] shadow-lg" title="Group Admin">
                                    <Shield size={8} className="text-white" />
                                  </div>
                                )}
                              </div>
                              <div className="flex flex-col">
                                <span className={clsx("text-sm font-bold", mid === user?.uid ? "text-master-red" : "text-white")}>
                                  {mProfile?.displayName || "Loading..."} {mid === user?.uid && "(You)"}
                                </span>
                                <div className="flex gap-1 items-center mt-0.5">
                                  {isAdmin && (
                                    <span className="text-[7px] font-black uppercase text-white px-1.5 py-0.5 bg-master-red rounded shadow-sm tracking-tighter">Admin</span>
                                  )}
                                  {mProfile?.uniqueId && (
                                    <span className="text-[7px] font-mono text-gray-500">#{mProfile.uniqueId}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover/member:opacity-100 transition-opacity">
                              {group.adminIds.includes(user?.uid || "") && mid !== user?.uid && (
                                <>
                                  {!isAdmin && (
                                    <button 
                                      onClick={async () => {
                                        const { makeGroupAdmin } = await import("./lib/firestoreService");
                                        await makeGroupAdmin(group.id, mid);
                                      }}
                                      className="p-1.5 hover:bg-master-red/20 rounded-lg text-gray-500 hover:text-white transition-colors"
                                      title="Promote to Admin"
                                    >
                                      <Shield size={14} />
                                    </button>
                                  )}
                                  <button 
                                    onClick={() => handleRemoveMemberFromGroup(mid)}
                                    className="p-1.5 hover:bg-master-red/20 rounded-lg text-gray-500 hover:text-master-red transition-colors"
                                    title="Remove Member"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
                
                <div className="p-4 border-t border-white/10 bg-black/20">
                  <button 
                    onClick={handleLeaveGroup}
                    className="w-full py-3 border border-master-red/30 text-master-red rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-master-red/10 transition"
                  >
                    <LogOut size={18} /> Exit Group
                  </button>
                </div>
              </div>
            </div>
          );
        })()
      )}

      {/* Create Community Modal */}
      {showCreateCommunity && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[150] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-[#1A2332] border border-white/10 rounded-3xl w-full max-w-md shadow-2xl p-6 glassmorphism">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold flex items-center gap-2">
                <Shield className="text-premium-blue" />
                New Community
              </h3>
              <button onClick={() => setShowCreateCommunity(false)} className="p-2 hover:bg-white/10 rounded-full">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] uppercase font-black text-gray-500 tracking-widest block mb-1">Community Name</label>
                <input 
                  type="text" 
                  value={communityName}
                  onChange={(e) => setCommunityName(e.target.value)}
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-premium-blue font-extrabold text-xl"
                  placeholder="Tech Enthusiasts"
                />
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                Communities bring related groups together. You will get an <strong>Announcement Channel</strong> and the ability to link multiple groups.
              </p>
              <button 
                onClick={handleCreateCommunity}
                disabled={!communityName.trim()}
                className="w-full py-4 bg-premium-blue hover:bg-blue-700 text-white rounded-xl font-bold shadow-[0_0_20px_rgba(33,150,243,0.3)] transition-all disabled:opacity-50"
              >
                Launch Community
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Message Context Menu Modal */}
      {contextMenuMessage && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setContextMenuMessage(null)}>
          <div className="bg-[#1A2332] border border-white/10 rounded-3xl w-full max-w-xs shadow-2xl overflow-hidden glassmorphism" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-white/5 bg-white/5">
              <h4 className="text-white font-bold text-center">Message Actions</h4>
            </div>
            {/* Quick Reactions */}
            <div className="flex justify-around p-3 border-b border-white/5 bg-black/20">
              {['❤️', '😂', '😮', '😢', '🙏', '🔥'].map(emoji => (
                <button 
                  key={emoji}
                  onClick={() => {
                    if (currentRoom) addReaction(currentRoom.id, contextMenuMessage.id, user!.uid, emoji);
                    setContextMenuMessage(null);
                  }}
                  className="text-xl hover:scale-125 transition-transform p-1"
                >
                  {emoji}
                </button>
              ))}
            </div>
            <div className="p-2 space-y-1">
              <button 
                onClick={() => {
                   setReplyTarget(contextMenuMessage);
                   setContextMenuMessage(null);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-white hover:bg-white/10 rounded-2xl transition-colors"
              >
                <MessageCircle size={18} className="text-master-red" />
                <span>Reply</span>
              </button>
              <button 
                onClick={() => handleMessageCopy(contextMenuMessage)}
                className="w-full flex items-center gap-3 px-4 py-3 text-white hover:bg-white/10 rounded-2xl transition-colors"
              >
                <Copy size={18} className="text-premium-blue" />
                <span>Copy</span>
              </button>
              {contextMenuMessage.senderId === user?.uid && (
                <button 
                  onClick={() => handleMessageCut(contextMenuMessage)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-white hover:bg-white/10 rounded-2xl transition-colors"
                >
                  <Scissors size={18} className="text-master-red" />
                  <span>Cut</span>
                </button>
              )}
              <button 
                onClick={() => setContextMenuMessage(null)}
                className="w-full flex items-center gap-3 px-4 py-3 text-white hover:bg-white/10 rounded-2xl transition-colors"
              >
                <MousePointer2 size={18} className="text-gray-400" />
                <span>Select</span>
              </button>
              <button 
                onClick={() => handleMessageSpeak(contextMenuMessage)}
                className="w-full flex items-center gap-3 px-4 py-3 text-white hover:bg-white/10 rounded-2xl transition-colors"
              >
                <Volume2 size={18} className="text-green-500" />
                <span>Speak</span>
              </button>
              <button 
                onClick={() => handleTranslate(contextMenuMessage)}
                className="w-full flex items-center gap-3 px-4 py-3 text-white hover:bg-white/10 rounded-2xl transition-colors"
              >
                <Languages size={18} className="text-yellow-500" />
                <span>Translate</span>
              </button>
              {contextMenuMessage.senderId === user?.uid && (
                <button 
                  onClick={() => handleMessageDelete(contextMenuMessage)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-master-red hover:bg-red-500/10 rounded-2xl transition-colors"
                >
                  <Trash2 size={18} />
                  <span>Delete</span>
                </button>
              )}
            </div>
            <button 
              onClick={() => setContextMenuMessage(null)}
              className="w-full p-4 text-gray-400 hover:text-white border-t border-white/5 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Profile Edit Modal */}
      {showProfileEdit && userProfile && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[110] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-[#1A2332] border border-white/10 p-6 rounded-3xl max-w-sm w-full shadow-2xl relative overflow-hidden glassmorphism">
             {/* Decorative header */}
             <div className="absolute top-0 left-0 right-0 h-28 bg-gradient-to-b from-premium-blue/30 to-transparent -z-10" />
            
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                   <Smile size={20} className="text-premium-blue" />
                   Profile Settings
                </h3>
                <button onClick={() => setShowProfileEdit(false)} className="p-2 hover:bg-white/10 rounded-full text-gray-400">
                  <X size={20} />
                </button>
             </div>

              <div className="flex flex-col items-center mb-6">
                <div className="relative group">
                  <div className="w-24 h-24 rounded-full border-4 border-[#1A2332] overflow-hidden shadow-2xl relative transition-transform hover:scale-105">
                    <img 
                      src={userProfile.photoURL || `https://ui-avatars.com/api/?name=${userProfile.displayName}&background=1A237E&color=fff`} 
                      alt="Profile" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <label className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 cursor-pointer transition-all">
                      <ImageIcon className="text-white mb-1" size={24} />
                      <span className="text-[10px] text-white font-bold uppercase">Change</span>
                      <input type="file" className="hidden" accept="image/*" onChange={handleProfileImageChange} />
                    </label>
                  </div>
                  {isUploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full z-10">
                      <div className="w-8 h-8 border-2 border-premium-blue border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <div className="text-xs font-mono bg-master-red px-2 py-0.5 rounded text-white shadow-sm border border-white/10 uppercase tracking-tighter">
                    ID: {userProfile.uniqueId}
                  </div>
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <div className="flex justify-between items-center mb-1.5 px-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em]">Display Name</label>
                    <span className={clsx("text-[9px] font-bold", editProfileName.length > 25 ? "text-red-400" : "text-gray-500")}>
                      {editProfileName.length}/25
                    </span>
                  </div>
                  <input 
                    type="text" 
                    value={editProfileName}
                    onChange={(e) => setEditProfileName(e.target.value.slice(0, 25))}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white font-medium focus:border-premium-blue focus:ring-1 focus:ring-premium-blue/50 outline-none transition-all placeholder:text-gray-600 shadow-inner"
                    placeholder="Your display name..."
                  />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1.5 px-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em]">Bio / About</label>
                    <span className={clsx("text-[9px] font-bold", editProfileBio.length > 150 ? "text-red-400" : "text-gray-500")}>
                      {editProfileBio.length}/150
                    </span>
                  </div>
                  <textarea 
                    value={editProfileBio}
                    onChange={(e) => setEditProfileBio(e.target.value.slice(0, 150))}
                    rows={4}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-premium-blue focus:ring-1 focus:ring-premium-blue/50 outline-none transition-all resize-none placeholder:text-gray-600 shadow-inner"
                    placeholder="Write something about yourself..."
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] mb-1.5 block px-1">Translation Language</label>
                  <div className="relative">
                    <select 
                      value={targetLanguage}
                      onChange={(e) => setTargetLanguage(e.target.value)}
                      className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white appearance-none cursor-pointer focus:border-premium-blue focus:ring-1 focus:ring-premium-blue/50 outline-none transition-all"
                    >
                      {LANGUAGES.map(lang => (
                        <option key={lang} value={lang} className="bg-[#1A2332]">{lang}</option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                      <Languages size={16} />
                    </div>
                  </div>
                </div>
                <button 
                  onClick={handleUpdateProfile}
                  className="w-full bg-gradient-to-r from-premium-blue to-blue-700 hover:from-blue-600 hover:to-blue-800 text-white font-extrabold py-4 rounded-xl shadow-[0_0_20px_rgba(33,150,243,0.3)] transition-all transform hover:scale-[1.01] active:scale-95 mt-2 uppercase tracking-widest text-xs"
                >
                  Apply Changes
                </button>
              </div>
          </div>
        </div>
      )}

      {/* Viewing Other User Profile Modal */}
      {viewingUserProfile && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[110] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-[#0F172A] border border-white/10 p-0 rounded-[2.5rem] max-w-sm w-full shadow-2xl relative overflow-hidden glassmorphism transform transition-all scale-100">
             {/* Profile Header Image/Color */}
             <div className="h-32 bg-gradient-to-br from-premium-blue via-blue-900 to-bg-dark flex items-end justify-center relative">
                <button 
                  onClick={() => setViewingUserProfile(null)} 
                  className="absolute top-4 right-4 p-2 bg-black/40 hover:bg-black/60 rounded-full text-white transition-colors z-20 backdrop-blur-md"
                >
                  <X size={20} />
                </button>
                <div className="absolute -bottom-12 w-28 h-28 rounded-full border-4 border-[#0F172A] overflow-hidden shadow-2xl bg-bg-panel">
                  {viewingUserProfile.photoURL ? (
                    <img src={viewingUserProfile.photoURL} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-premium-blue-light flex items-center justify-center text-3xl font-black text-white">
                      {viewingUserProfile.displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
             </div>
             
             <div className="pt-16 pb-8 px-6 flex flex-col items-center">
                <h3 className="text-2xl font-black text-white mb-1 uppercase tracking-tight">{viewingUserProfile.displayName}</h3>
                <div className="bg-master-red text-[10px] font-black text-white px-3 py-1 rounded-full flex items-center gap-1 shadow-lg border border-white/10 uppercase tracking-widest mb-6">
                  <Check size={8} strokeWidth={4} /> {viewingUserProfile.uniqueId}
                </div>
                
                <div className="w-full bg-white/5 border border-white/5 rounded-3xl p-5 mb-6 text-center shadow-inner">
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-2">About / Bio</span>
                  <p className="text-gray-300 text-sm leading-relaxed italic">
                    {viewingUserProfile.bio || `No bio available for ${viewingUserProfile.displayName}.`}
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-3 w-full">
                  <button 
                    onClick={() => {
                        open1on1Room(viewingUserProfile);
                        setViewingUserProfile(null);
                    }}
                    className="flex flex-col items-center justify-center p-4 bg-premium-blue hover:bg-blue-600 rounded-3xl transition-all group active:scale-95"
                  >
                    <MessageCircle size={20} className="text-white mb-1 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-black text-white uppercase tracking-widest">Message</span>
                  </button>
                  <button 
                    className="flex flex-col items-center justify-center p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-3xl transition-all group active:scale-95"
                  >
                    <ImageIcon size={20} className="text-gray-400 mb-1 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Gallery</span>
                  </button>
                </div>
             </div>
          </div>
        </div>
      )}

      {viewingStory && (
        <StoryViewModal 
          story={viewingStory} 
          onClose={() => setViewingStory(null)} 
        />
      )}

      {/* Delete Confirmation Modal */}
      {messageToDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[150] flex items-center justify-center p-4 animate-in fade-in zoom-in duration-200">
          <div className="bg-[#1A2332] border border-white/10 p-6 rounded-3xl max-w-sm w-full shadow-2xl overflow-hidden relative">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-red-500" />
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 mb-2">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-bold text-white">Delete Message?</h3>
              <p className="text-gray-400 text-sm">
                Are you sure you want to delete this message? This action cannot be undone.
              </p>
              
              <div className="flex flex-col w-full gap-2 pt-4">
                <button 
                  onClick={confirmDelete}
                  className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl shadow-lg transition-all transform active:scale-95"
                >
                  Delete for Everyone
                </button>
                <button 
                  onClick={() => setMessageToDelete(null)}
                  className="w-full bg-white/5 hover:bg-white/10 text-white font-semibold py-3 rounded-xl transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

