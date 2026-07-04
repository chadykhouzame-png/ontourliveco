import { createContext, useContext, useState, ReactNode } from 'react';

export interface WebhookTestResult {
  success: boolean;
  status?: number;
  duration_ms?: number;
  event_id?: string;
  event_type?: string;
  response_body?: string;
  error?: string;
  ranAt: number;
}

interface Ctx {
  lastResult: WebhookTestResult | null;
  setLastResult: (r: WebhookTestResult | null) => void;
}

const WebhookTestContext = createContext<Ctx>({
  lastResult: null,
  setLastResult: () => {},
});

export const WebhookTestProvider = ({ children }: { children: ReactNode }) => {
  const [lastResult, setLastResult] = useState<WebhookTestResult | null>(null);
  return (
    <WebhookTestContext.Provider value={{ lastResult, setLastResult }}>
      {children}
    </WebhookTestContext.Provider>
  );
};

export const useWebhookTest = () => useContext(WebhookTestContext);
