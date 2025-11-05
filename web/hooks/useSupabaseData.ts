import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { User } from '@/lib/dataModel';

export function useSupabaseData() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchUsers() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('setters_users')
          .select('*')


        if (error) throw error;

        // Transform Supabase data to match your User type
        const transformedUsers: User[] = (data || []).map(user => ({
          id: user.id,
          name: user.name,
          isActive: user.is_active
        }));

        setUsers(transformedUsers);
      } catch (err) {
        console.error('Error fetching users:', err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    fetchUsers();
  }, []);

  return { users, loading, error };
}