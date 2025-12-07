import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabaseClient';
import { useCurrentEmployee } from './useCurrentEmployee';

export function useMyPoints() {
  const { data: employee } = useCurrentEmployee();

  return useQuery({
    queryKey: ['points', employee?.id],
    enabled: !!employee,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('points_ledger')
        .select('amount')
        .eq('employee_id', employee.id);

      if (error) throw error;

      return data.reduce((sum, row) => sum + row.amount, 0);
    },
  });
}
