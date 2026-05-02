import { collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy, serverTimestamp, setDoc, getDocs, getDoc, runTransaction, arrayUnion, where, limit, or, arrayRemove } from "firebase/firestore";
import { db, auth } from "./firebase";
import { Room, Message, UserProfile, Story, Group, Community } from "../types";

// ... (OperationType and other helpers stay same as before)

export const createGroup = async (name: string, description: string, memberIds: string[], adminId: string) => {
  const path = 'groups';
  try {
    const groupRef = doc(collection(db, path));
    
    // Generate unique 5-digit ID
    let uniqueId = '';
    let exists = true;
    while(exists) {
      const code = Math.floor(10000 + Math.random() * 90000).toString();
      const idRef = doc(db, 'group_ids', code);
      const idSnap = await getDoc(idRef);
      if (!idSnap.exists()) {
        uniqueId = code;
        exists = false;
        await setDoc(idRef, { groupId: groupRef.id });
      }
    }

    const newGroup: Group = {
      id: groupRef.id,
      name,
      description,
      adminIds: [adminId],
      memberIds: Array.from(new Set([...memberIds, adminId])),
      uniqueId,
      createdAt: Date.now()
    };

    await setDoc(groupRef, {
      ...newGroup,
      createdAt: serverTimestamp()
    });

    return groupRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const joinGroupByCode = async (code: string, userId: string): Promise<string | null> => {
  try {
    const idRef = doc(db, 'group_ids', code);
    const idSnap = await getDoc(idRef);
    if (!idSnap.exists()) return null;

    const groupId = idSnap.data().groupId;
    const groupRef = doc(db, 'groups', groupId);
    await updateDoc(groupRef, {
      memberIds: arrayUnion(userId)
    });
    return groupId;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, 'groups');
    return null;
  }
};

export const subscribeToGroups = (userId: string, callback: (groups: Group[]) => void) => {
  const q = query(collection(db, 'groups'), where('memberIds', 'array-contains', userId));
  return onSnapshot(q, (snapshot) => {
    const groups: Group[] = [];
    snapshot.forEach(doc => {
      groups.push(mapDocData<Group>(doc));
    });
    callback(groups);
  });
};

export const createCommunity = async (name: string, description: string, ownerId: string) => {
  const path = 'communities';
  try {
    const communityRef = doc(collection(db, path));
    const uniqueId = `COM-${Math.floor(1000 + Math.random() * 9000)}`;
    
    const newCommunity: Community = {
      id: communityRef.id,
      name,
      description,
      ownerId,
      adminIds: [ownerId],
      memberIds: [ownerId],
      uniqueId,
      createdAt: Date.now()
    };

    await setDoc(communityRef, {
      ...newCommunity,
      createdAt: serverTimestamp()
    });

    return communityRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const subscribeToCommunities = (userId: string, callback: (communities: Community[]) => void) => {
  const q = query(collection(db, 'communities'), where('memberIds', 'array-contains', userId));
  return onSnapshot(q, (snapshot) => {
    const communities: Community[] = [];
    snapshot.forEach(doc => {
      communities.push(mapDocData<Community>(doc));
    });
    callback(communities);
  });
};

export const sendGroupMessage = async (groupId: string, text: string, user: { uid: string, displayName: string, photoURL?: string }) => {
  const path = `groups/${groupId}/messages`;
  try {
    const messageRef = doc(collection(db, path));
    await setDoc(messageRef, {
      text,
      senderId: user.uid,
      senderName: user.displayName || "Unknown User",
      senderPhotoURL: user.photoURL || null,
      status: 'sent',
      seenBy: [user.uid],
      createdAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const subscribeToGroupMessages = (groupId: string, callback: (messages: Message[]) => void) => {
  const path = `groups/${groupId}/messages`;
  const q = query(collection(db, path), orderBy("createdAt", "asc"));
  return onSnapshot(q, (snapshot) => {
    const messages: Message[] = [];
    snapshot.forEach(doc => {
      messages.push(mapDocData<Message>(doc));
    });
    callback(messages);
  });
};

export const sendAnnouncement = async (communityId: string, text: string, user: { uid: string, displayName: string, photoURL?: string }) => {
  const path = `communities/${communityId}/announcements`;
  try {
    const messageRef = doc(collection(db, path));
    await setDoc(messageRef, {
      text,
      senderId: user.uid,
      senderName: user.displayName || "Unknown User",
      senderPhotoURL: user.photoURL || null,
      status: 'sent',
      seenBy: [user.uid],
      createdAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const subscribeToAnnouncements = (communityId: string, callback: (messages: Message[]) => void) => {
  const path = `communities/${communityId}/announcements`;
  const q = query(collection(db, path), orderBy("createdAt", "asc"));
  return onSnapshot(q, (snapshot) => {
    const messages: Message[] = [];
    snapshot.forEach(doc => {
      messages.push(mapDocData<Message>(doc));
    });
    callback(messages);
  });
};

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Helper to convert Firestore Timestamps to milliseconds
const mapDocData = <T>(doc: any): T => {
  const data = doc.data();
  const result = { id: doc.id, ...data };
  
  for (const key in result) {
    if (result[key] && typeof result[key] === 'object' && 'toMillis' in result[key]) {
      result[key] = result[key].toMillis();
    }
  }
  
  // Specifically check common timestamp fields that might be null during optimistic updates
  if (result.createdAt === undefined || result.createdAt === null) {
    result.createdAt = Date.now();
  }
  if (result.lastMessageAt === null) {
    result.lastMessageAt = Date.now();
  }
  
  return result as T;
};

export const getOrCreateUserProfile = async (user: {uid: string, displayName: string | null, photoURL: string | null, email: string | null}): Promise<UserProfile | null> => {
  const profileRef = doc(db, 'userProfiles', user.uid);
  try {
    const profileSnap = await getDoc(profileRef);
    if (profileSnap.exists()) {
      const data = profileSnap.data() as UserProfile;
      // Update photoURL if it's missing or changed and the user logged in with a photo
      if (user.photoURL && data.photoURL !== user.photoURL) {
        await updateDoc(profileRef, { photoURL: user.photoURL });
        data.photoURL = user.photoURL;
      }
      // Update email if missing
      if (user.email && !data.email) {
        await updateDoc(profileRef, { email: user.email.toLowerCase() });
        (data as any).email = user.email.toLowerCase();
      }
      return data;
    }

    // Generate unique ID
    let uniqueId = '';
    let exists = true;
    while(exists) {
      const code = Math.floor(10000 + Math.random() * 90000);
      uniqueId = `DB-${code}`;
      const idRef = doc(db, 'user_ids', uniqueId);
      const idSnap = await getDoc(idRef);
      if (!idSnap.exists()) {
        exists = false;
        await setDoc(idRef, { uid: user.uid });
      }
    }

    const newProfile: any = {
      uid: user.uid,
      displayName: user.displayName || 'Unknown',
      uniqueId,
      contacts: [],
      email: user.email?.toLowerCase() || null,
    };
    if (user.photoURL) newProfile.photoURL = user.photoURL;

    await setDoc(profileRef, newProfile);
    return newProfile as UserProfile;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, 'userProfiles');
    return null;
  }
};

export const searchUserByUniqueId = async (uniqueId: string): Promise<UserProfile | null> => {
  try {
    const uppercaseId = uniqueId.toUpperCase();
    const idRef = doc(db, 'user_ids', uppercaseId);
    const idSnap = await getDoc(idRef);
    if (!idSnap.exists()) return null;

    const targetUid = idSnap.data().uid;
    const profileRef = doc(db, 'userProfiles', targetUid);
    const profileSnap = await getDoc(profileRef);
    return profileSnap.exists() ? (profileSnap.data() as UserProfile) : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, 'user_ids');
    return null;
  }
};

export const searchUserByEmail = async (email: string): Promise<UserProfile | null> => {
  try {
    const q = query(collection(db, 'userProfiles'), where('email', '==', email.toLowerCase()), limit(1));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    return snapshot.docs[0].data() as UserProfile;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, 'userProfiles');
    return null;
  }
};

export const searchUserByDisplayName = async (displayName: string): Promise<UserProfile[]> => {
  try {
    const q = query(collection(db, 'userProfiles'), where('displayName', '>=', displayName), where('displayName', '<=', displayName + '\uf8ff'), limit(10));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as UserProfile);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, 'userProfiles');
    return [];
  }
};

export const addUserToGroup = async (groupId: string, userId: string) => {
  const path = `groups/${groupId}`;
  try {
    const groupRef = doc(db, 'groups', groupId);
    await updateDoc(groupRef, {
      memberIds: arrayUnion(userId)
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const removeUserFromGroup = async (groupId: string, userId: string) => {
  const path = `groups/${groupId}`;
  try {
    const groupRef = doc(db, 'groups', groupId);
    await updateDoc(groupRef, {
      memberIds: arrayRemove(userId),
      adminIds: arrayRemove(userId)
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const makeGroupAdmin = async (groupId: string, userId: string) => {
  const path = `groups/${groupId}`;
  try {
    const groupRef = doc(db, 'groups', groupId);
    await updateDoc(groupRef, {
      adminIds: arrayUnion(userId)
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const addContact = async (currentUid: string, contactUid: string) => {
  try {
    const profileRef = doc(db, 'userProfiles', currentUid);
    await updateDoc(profileRef, {
      contacts: arrayUnion(contactUid)
    });

    // Automatically create 1-on-1 room if not exist? Or dynamically determine room ID.
    // We will use derived room ID: currentUid < contactUid ? currentUid + '_' + contactUid : contactUid + '_' + currentUid
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, 'userProfiles');
  }
};

export const subscribeToUserProfile = (uid: string, callback: (profile: UserProfile) => void) => {
  const path = `userProfiles/${uid}`;
  return onSnapshot(doc(db, path), (doc) => {
    if (doc.exists()) {
      callback(doc.data() as UserProfile);
    }
  }, (error) => handleFirestoreError(error, OperationType.GET, path));
};

export const fetchContactsProfiles = async (contactUids: string[]): Promise<UserProfile[]> => {
  if (contactUids.length === 0) return [];
  try {
    // In strict scenarios, we'd chunk this if > 10, but 10 matches is fine for now
    const profiles: UserProfile[] = [];
    for (const uid of contactUids) {
      const p = await getDoc(doc(db, 'userProfiles', uid));
      if (p.exists()) profiles.push(p.data() as UserProfile);
    }
    return profiles;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, 'userProfiles');
    return [];
  }
};

export const subscribeToRooms = (uid: string, callback: (rooms: Room[]) => void) => {
  const path = 'rooms';
  // Use or filter to find rooms where user is participant OR created the room
  // This matches security rules and prevents "Missing or insufficient permissions"
  const q = query(
    collection(db, path),
    or(
      where("participants", "array-contains", uid),
      where("createdBy", "==", uid)
    ),
    orderBy("createdAt", "desc")
  );
  
  return onSnapshot(q, (snapshot) => {
    const roomsData: Room[] = [];
    snapshot.forEach((doc) => {
      roomsData.push(mapDocData<Room>(doc));
    });
    callback(roomsData);
  }, (error) => {
    // If the room query fails (e.g. if OR filters are not indexing correctly yet or version issues), 
    // fall back to a simpler check or log it clearly
    handleFirestoreError(error, OperationType.LIST, path);
  });
};

export const addReaction = async (roomId: string, messageId: string, emoji: string, userId: string) => {
  const path = `rooms/${roomId}/messages/${messageId}`;
  try {
    const msgRef = doc(db, path);
    await updateDoc(msgRef, {
      [`reactions.${userId}`]: emoji
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const addStory = async (user: { uid: string, displayName: string, photoURL?: string }, imageUrl?: string, text?: string) => {
  const path = 'stories';
  try {
    const storyRef = doc(collection(db, path));
    await setDoc(storyRef, {
      userId: user.uid,
      userName: user.displayName || "Unknown",
      userPhoto: user.photoURL || null,
      imageUrl: imageUrl || null,
      text: text || null,
      createdAt: serverTimestamp(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours from now
      viewers: []
    });
    return storyRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const subscribeToStories = (callback: (stories: Story[]) => void) => {
  const path = 'stories';
  const q = query(collection(db, path));
  return onSnapshot(q, (snapshot) => {
    const storiesData: Story[] = [];
    const now = Date.now();
    snapshot.forEach((doc) => {
      const data = mapDocData<Story>(doc);
      if ((data.expiresAt || 0) > now) {
        storiesData.push(data);
      }
    });
    // Sort client-side by createdAt descending
    storiesData.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    callback(storiesData);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path);
  });
};

export const markStorySeen = async (storyId: string, userId: string) => {
  const path = `stories/${storyId}`;
  try {
    const storyRef = doc(db, path);
    await updateDoc(storyRef, {
      viewers: arrayUnion(userId)
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const subscribeToMessages = (roomId: string, callback: (messages: Message[]) => void) => {
  if (!auth.currentUser) {
    console.warn("Attempted to subscribe to messages without auth");
    return () => {};
  }
  const path = `rooms/${roomId}/messages`;
  const q = query(collection(db, path), orderBy("createdAt", "asc"));
  return onSnapshot(q, (snapshot) => {
    const messagesData: Message[] = [];
    snapshot.forEach((doc) => {
      messagesData.push(mapDocData<Message>(doc));
    });
    callback(messagesData);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path);
  });
};

export const getOrCreate1on1Room = async (user1Uid: string, user2Uid: string, user2Name: string) => {
  const path = 'rooms';
  const roomId = user1Uid < user2Uid ? `${user1Uid}_${user2Uid}` : `${user2Uid}_${user1Uid}`;
  try {
    const roomRef = doc(db, path, roomId);
    const roomSnap = await getDoc(roomRef);
    if (!roomSnap.exists()) {
      await setDoc(roomRef, {
        name: `Chat`,
        createdBy: user1Uid,
        createdAt: serverTimestamp(),
        participants: [user1Uid, user2Uid]
      });
    }
    return roomId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const createPoll = async (roomId: string, question: string, options: string[], userId: string) => {
  const path = `rooms/${roomId}/polls`;
  try {
    const pollRef = doc(collection(db, path));
    await setDoc(pollRef, {
      roomId,
      question,
      options,
      votes: {},
      createdBy: userId,
      createdAt: serverTimestamp(),
    });
    return pollRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const votePoll = async (roomId: string, pollId: string, optionIndex: number, userId: string) => {
  const path = `rooms/${roomId}/polls/${pollId}`;
  try {
    const pollRef = doc(db, path);
    await updateDoc(pollRef, {
      [`votes.${userId}`]: optionIndex
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const subscribeToPoll = (roomId: string, pollId: string, callback: (poll: any) => void) => {
  const path = `rooms/${roomId}/polls/${pollId}`;
  return onSnapshot(doc(db, path), (docSnap) => {
    if (docSnap.exists()) {
      callback(mapDocData<any>(docSnap));
    }
  }, (error) => handleFirestoreError(error, OperationType.GET, path));
};

export const createRoom = async (name: string, userId: string) => {
  const path = 'rooms';
  try {
    const roomRef = doc(collection(db, path));
    await setDoc(roomRef, {
      name,
      createdBy: userId,
      createdAt: serverTimestamp(),
    });
    return roomRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const updateUserProfile = async (uid: string, updates: Partial<UserProfile>) => {
  const path = `userProfiles/${uid}`;
  try {
    const profileRef = doc(db, 'userProfiles', uid);
    await updateDoc(profileRef, updates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const sendMessage = async (roomId: string, text: string, user: { uid: string, displayName: string, photoURL?: string }, replyTo?: Message['replyTo']) => {
  const path = `rooms/${roomId}/messages`;
  try {
    const messageRef = doc(collection(db, path));
    const payload: any = {
      text,
      senderId: user.uid,
      senderName: user.displayName || "Unknown User",
      senderPhotoURL: user.photoURL || null,
      status: 'sent',
      seenBy: [user.uid],
      createdAt: serverTimestamp()
    };
    if (replyTo) {
      const sanitizedReply: any = {};
      Object.keys(replyTo).forEach(key => {
        if ((replyTo as any)[key] !== undefined) {
          sanitizedReply[key] = (replyTo as any)[key];
        }
      });
      payload.replyTo = sanitizedReply;
    }

    await setDoc(messageRef, payload);

    const roomRef = doc(db, 'rooms', roomId);
    await updateDoc(roomRef, {
      lastMessage: text,
      lastMessageAt: serverTimestamp(),
      lastMessageSenderId: user.uid,
      lastMessageStatus: 'sent'
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const sendImageMessage = async (roomId: string, imageUrl: string, lastMessageText: string, user: { uid: string, displayName: string, photoURL?: string }, replyTo?: Message['replyTo']) => {
  const path = `rooms/${roomId}/messages`;
  try {
    const messageRef = doc(collection(db, path));
    const payload: any = {
      imageUrl,
      senderId: user.uid,
      senderName: user.displayName || "Unknown User",
      senderPhotoURL: user.photoURL || null,
      status: 'sent',
      seenBy: [user.uid],
      createdAt: serverTimestamp()
    };
    if (replyTo) {
      const sanitizedReply: any = {};
      Object.keys(replyTo).forEach(key => {
        if ((replyTo as any)[key] !== undefined) {
          sanitizedReply[key] = (replyTo as any)[key];
        }
      });
      payload.replyTo = sanitizedReply;
    }

    await setDoc(messageRef, payload);

    const roomRef = doc(db, 'rooms', roomId);
    await updateDoc(roomRef, {
      lastMessage: lastMessageText,
      lastMessageAt: serverTimestamp(),
      lastMessageSenderId: user.uid,
      lastMessageStatus: 'sent'
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const sendStructuredMessage = async (
  roomId: string,
  payload: Partial<Omit<Message, 'id' | 'senderId' | 'senderName' | 'senderPhotoURL' | 'createdAt' | 'status'>>,
  lastMessageText: string,
  user: { uid: string, displayName: string, photoURL?: string },
  replyTo?: Message['replyTo']
) => {
  const path = `rooms/${roomId}/messages`;
  try {
    const messageRef = doc(collection(db, path));
    const fullPayload: any = {
      ...payload,
      senderId: user.uid,
      senderName: user.displayName || "Unknown User",
      senderPhotoURL: user.photoURL || null,
      status: 'sent',
      seenBy: [user.uid],
      createdAt: serverTimestamp()
    };
    
    if (replyTo) {
      // Sanitize replyTo to remove undefined values
      const sanitizedReply: any = {};
      Object.keys(replyTo).forEach(key => {
        if ((replyTo as any)[key] !== undefined) {
          sanitizedReply[key] = (replyTo as any)[key];
        }
      });
      fullPayload.replyTo = sanitizedReply;
    }

    await setDoc(messageRef, fullPayload);

    const roomRef = doc(db, 'rooms', roomId);
    await updateDoc(roomRef, {
      lastMessage: lastMessageText,
      lastMessageAt: serverTimestamp(),
      lastMessageSenderId: user.uid,
      lastMessageStatus: 'sent'
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const updateMessageStatus = async (roomId: string, messageId: string, status: 'delivered' | 'seen', isLastMessage: boolean = false) => {
  const path = `rooms/${roomId}/messages/${messageId}`;
  try {
    const messageRef = doc(db, `rooms/${roomId}/messages`, messageId);
    await updateDoc(messageRef, { status });
    
    if (isLastMessage) {
      const roomRef = doc(db, 'rooms', roomId);
      const roomSnap = await getDoc(roomRef);
      if (roomSnap.exists() && roomSnap.data().lastMessageSenderId !== auth.currentUser?.uid) {
        await updateDoc(roomRef, {
          lastMessageStatus: status
        });
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const deleteMessage = async (roomId: string, messageId: string) => {
  const path = `rooms/${roomId}/messages/${messageId}`;
  try {
    const messageRef = doc(db, 'rooms', roomId, 'messages', messageId);
    await deleteDoc(messageRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

export const markMessagesAsSeen = async (id: string, messages: Message[], currentUserId: string, type: string = 'room') => {
  const unreadMessages = messages.filter(m => (!m.seenBy || !m.seenBy.includes(currentUserId)) && m.senderId !== currentUserId);
  if (unreadMessages.length === 0) return;

  const pathPrefix = type === 'group' ? `groups/${id}` : type === 'announcement' ? `communities/${id}` : `rooms/${id}`;
  const collectionName = type === 'announcement' ? 'announcements' : 'messages';

  try {
    const lastMessage = messages[messages.length - 1];
    for (const msg of unreadMessages) {
      const msgRef = doc(db, `${pathPrefix}/${collectionName}`, msg.id);
      await updateDoc(msgRef, {
        seenBy: arrayUnion(currentUserId),
        status: 'seen'
      });
      
      if (msg.id === lastMessage.id && type === 'room') {
        const roomRef = doc(db, 'rooms', id);
        const roomSnap = await getDoc(roomRef);
        if (roomSnap.exists()) {
          const roomData = roomSnap.data();
          if (roomData.lastMessageSenderId !== currentUserId) {
             const participants = roomData.participants || [];
             const seenByCount = (msg.seenBy?.length || 0) + 1; 
             
             await updateDoc(roomRef, {
               lastMessageStatus: seenByCount >= participants.length ? 'seen' : 'delivered'
             });
          }
        }
      }
    }
  } catch (error) {
    console.error("Error marking messages as seen:", error);
  }
};

export const updateTypingStatus = async (roomId: string, userId: string, isTyping: boolean) => {
  const path = `rooms/${roomId}/typing/${userId}`;
  try {
    const typingRef = doc(db, 'rooms', roomId, 'typing', userId);
    if (isTyping) {
      await setDoc(typingRef, {
        isTyping: true,
        lastUpdate: serverTimestamp()
      });
    } else {
      await deleteDoc(typingRef);
    }
  } catch (error) {
    // Only log if it's not a permission error or handle it silently for typing
    console.error("Error updating typing status:", error);
  }
};

export const subscribeToTypingStatus = (roomId: string, callback: (typingUsers: string[]) => void) => {
  const path = `rooms/${roomId}/typing`;
  const q = query(collection(db, path));
  return onSnapshot(q, (snapshot) => {
    const typingUsers: string[] = [];
    const now = Date.now();
    snapshot.forEach((doc) => {
      const data = doc.data();
      // Only include if it was updated in the last 10 seconds to avoid stale indicators
      const lastUpdate = data.lastUpdate?.toMillis ? data.lastUpdate.toMillis() : Date.now();
      if (data.isTyping && (now - lastUpdate < 10000)) {
        typingUsers.push(doc.id);
      }
    });
    callback(typingUsers);
  }, (error) => {
    // Silently handle or log typing errors
    console.warn("Typing status subscription error:", error);
  });
};
