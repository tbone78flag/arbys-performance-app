import { supabase } from '../supabaseClient';
import { useCurrentEmployee } from '../hooks/useCurrentEmployee';

export function useAwardPoints() {
  const { data: employee } = useCurrentEmployee();

  async function awardPoints(amount, sourceType, sourceDetail) {
    if (!employee) throw new Error('No employee loaded');

    const { error } = await supabase.from('points_ledger').insert({
      employee_id: employee.id,
      location_id: employee.location_id,
      amount,
      source_type: sourceType,
      source_detail: sourceDetail,
    });

    if (error) throw error;
  }

  return { awardPoints };
}
