import { useQuery } from '@tanstack/react-query';
import { getAiSettings } from '../../settings/api/settings';

export function useAiEnabled() {
  const { data } = useQuery({
    queryKey: ['ai-settings'],
    queryFn: getAiSettings,
    staleTime: 5 * 60 * 1000,
  });

  return {
    enabled: data?.ai_enabled ?? true,
    provider: data?.ai_provider ?? null,
  };
}
