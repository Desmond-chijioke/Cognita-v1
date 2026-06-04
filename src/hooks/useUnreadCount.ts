import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../supabase/client';

export function useUnreadCount(myId: string): number {
  const [count, setCount] = useState(0);

  const fetchCount = useCallback(async () => {
    if (!myId) return;
    const { count: c } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', myId)
      .is('read_at', null);
    setCount(c ?? 0);
  }, [myId]);

  useEffect(() => {
    fetchCount();

    const channel = supabase
      .channel(`unread-badge-${myId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `receiver_id=eq.${myId}`,
      }, () => setCount(c => c + 1))
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'messages',
        filter: `receiver_id=eq.${myId}`,
      }, fetchCount)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [myId, fetchCount]);

  return count;
}
