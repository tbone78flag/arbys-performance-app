// src/hooks/useCurrentEmployee.js
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';

export function useCurrentEmployee() {
  return useQuery({
    queryKey: ['current-employee'],
    queryFn: async () => {
      const { data: userResult, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!userResult || !userResult.user) {
        throw new Error('Not logged in');
      }

      const user = userResult.user;

      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      return data;
    },
  });
}
