import { useEffect, useRef, useState, useCallback } from 'react';
import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';

export interface CollabComment {
  id:           string;
  author:       string;
  role:         string;
  text:         string;
  selectedText?: string;
  sectionId:    string;
  timestamp:    number;
  resolved:     boolean;
  color:        string;
}

export interface ConnectedUser {
  clientId: number;
  name:     string;
  email:    string;
  role:     string;
  color:    string;
  sectionId?: string;
}

// Singleton: one Y.Doc + WebrtcProvider per room, shared across all hook instances
const registry = new Map<string, { doc: Y.Doc; provider: WebrtcProvider; refCount: number }>();

const COLORS = ['#3b5bdb', '#0c8599', '#2f9e44', '#e67700', '#c2255c', '#7048e8'];

export function useCollaborativeDoc(roomId: string, userName: string, userEmail: string, userRole: string) {
  const [connectedUsers, setConnectedUsers] = useState<ConnectedUser[]>([]);
  const [comments,       setComments]       = useState<CollabComment[]>([]);

  const docRef     = useRef<Y.Doc | null>(null);
  const pRef       = useRef<WebrtcProvider | null>(null);
  const isLocalRef = useRef(false);
  // Stable random color for this session
  const colorRef   = useRef(COLORS[Math.floor(Math.random() * COLORS.length)]);

  useEffect(() => {
    if (!roomId) return;

    let entry = registry.get(roomId);
    if (!entry) {
      const doc      = new Y.Doc();
      const provider = new WebrtcProvider(roomId, doc, { signaling: [] });
      entry = { doc, provider, refCount: 0 };
      registry.set(roomId, entry);
    }
    entry.refCount++;
    docRef.current = entry.doc;
    pRef.current   = entry.provider;

    entry.provider.awareness.setLocalState({
      name:      userName,
      email:     userEmail,
      role:      userRole,
      color:     colorRef.current,
      sectionId: '',
    });

    const syncUsers = () => {
      const users: ConnectedUser[] = [];
      entry!.provider.awareness.getStates().forEach((state, clientId) => {
        if (state?.name) {
          users.push({
            clientId,
            name:      state.name      as string,
            email:     (state.email    as string) ?? '',
            role:      state.role      as string,
            color:     state.color     as string,
            sectionId: (state.sectionId as string) ?? '',
          });
        }
      });
      setConnectedUsers(users);
    };

    entry.provider.awareness.on('change', syncUsers);
    syncUsers();

    const yComments = entry.doc.getArray<CollabComment>('comments');
    const onComments = () => setComments(yComments.toArray());
    yComments.observe(onComments);
    setComments(yComments.toArray());

    return () => {
      entry!.provider.awareness.setLocalState(null);
      entry!.provider.awareness.off('change', syncUsers);
      yComments.unobserve(onComments);
      entry!.refCount--;
      if (entry!.refCount === 0) {
        entry!.provider.destroy();
        entry!.doc.destroy();
        registry.delete(roomId);
      }
    };
  }, [roomId, userName, userEmail, userRole]);

  // Seed a Y.Text with initial content if it's empty (first writer wins)
  const initSection = useCallback((sectionId: string, initialContent: string) => {
    const doc = docRef.current;
    if (!doc) return;
    const yText = doc.getText(`sec:${sectionId}`);
    if (yText.length === 0 && initialContent) yText.insert(0, initialContent);
  }, []);

  // Apply a minimal diff (common-prefix/suffix) to Y.Text — avoids losing cursor position
  const updateSection = useCallback((sectionId: string, oldVal: string, newVal: string) => {
    const doc = docRef.current;
    if (!doc) return;
    const yText = doc.getText(`sec:${sectionId}`);
    isLocalRef.current = true;

    let pre = 0;
    while (pre < oldVal.length && pre < newVal.length && oldVal[pre] === newVal[pre]) pre++;

    let oldSuf = 0, newSuf = 0;
    while (
      oldSuf < oldVal.length - pre &&
      newSuf < newVal.length - pre &&
      oldVal[oldVal.length - 1 - oldSuf] === newVal[newVal.length - 1 - newSuf]
    ) { oldSuf++; newSuf++; }

    const delCount = oldVal.length - pre - oldSuf;
    const insText  = newVal.slice(pre, newVal.length - newSuf);

    doc.transact(() => {
      if (delCount > 0) yText.delete(pre, delCount);
      if (insText)      yText.insert(pre, insText);
    });

    isLocalRef.current = false;
  }, []);

  // Subscribe to remote changes for a single section; returns cleanup fn
  const observeSection = useCallback((sectionId: string, cb: (content: string) => void) => {
    const doc = docRef.current;
    if (!doc) return () => {};
    const yText   = doc.getText(`sec:${sectionId}`);
    const handler = () => { if (!isLocalRef.current) cb(yText.toString()); };
    yText.observe(handler);
    return () => yText.unobserve(handler);
  }, []);

  // Broadcast which section the local user is currently editing
  const setActiveSection = useCallback((sectionId: string) => {
    const provider = pRef.current;
    if (!provider) return;
    const current = provider.awareness.getLocalState() ?? {};
    provider.awareness.setLocalState({ ...current, sectionId });
  }, []);

  const getSectionContent = useCallback((sectionId: string): string => {
    const doc = docRef.current;
    if (!doc) return '';
    return doc.getText(`sec:${sectionId}`).toString();
  }, []);

  const addComment = useCallback((c: Omit<CollabComment, 'id' | 'timestamp'>) => {
    const doc = docRef.current;
    if (!doc) return;
    doc.getArray<CollabComment>('comments').push([{
      ...c,
      id:        crypto.randomUUID(),
      timestamp: Date.now(),
    }]);
  }, []);

  const resolveComment = useCallback((id: string) => {
    const doc = docRef.current;
    if (!doc) return;
    const arr   = doc.getArray<CollabComment>('comments');
    const items = arr.toArray();
    const idx   = items.findIndex(c => c.id === id);
    if (idx === -1) return;
    doc.transact(() => {
      arr.delete(idx, 1);
      arr.insert(idx, [{ ...items[idx], resolved: true }]);
    });
  }, []);

  const deleteComment = useCallback((id: string) => {
    const doc = docRef.current;
    if (!doc) return;
    const arr   = doc.getArray<CollabComment>('comments');
    const items = arr.toArray();
    const idx   = items.findIndex(c => c.id === id);
    if (idx !== -1) arr.delete(idx, 1);
  }, []);

  return {
    connectedUsers,
    comments,
    userColor: colorRef.current,
    initSection,
    updateSection,
    observeSection,
    getSectionContent,
    setActiveSection,
    addComment,
    resolveComment,
    deleteComment,
  };
}
