import { useHoldingPage } from '@/hooks/useHoldingPage';
import FirstLight from '@/pages/FirstLight';
import Index from '@/pages/Index';

/**
 * Renders either the holding page or the full-site home based on the
 * `holding_page_enabled` site setting. Toggleable from the Admin Dashboard.
 */
const RootGate = () => {
  const { loading, enabled } = useHoldingPage();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return enabled ? <FirstLight /> : <Index />;
};

export default RootGate;
