import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

const CookieConsent = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) setVisible(true);
  }, []);

  const accept = () => {
    localStorage.setItem('cookie-consent', 'accepted');
    setVisible(false);
  };

  const decline = () => {
    localStorage.setItem('cookie-consent', 'declined');
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-lg rounded-2xl border border-border bg-card p-5 shadow-lg md:left-auto md:right-6 md:mx-0 md:max-w-md"
        >
          <p className="text-sm text-muted-foreground leading-relaxed">
            We use cookies to improve your experience. By continuing, you agree to our{' '}
            <Link to="/privacy" className="font-medium text-primary underline underline-offset-2 hover:text-primary/80">
              Privacy Policy
            </Link>
            .
          </p>
          <div className="mt-4 flex items-center gap-3">
            <Button size="sm" onClick={accept}>Accept</Button>
            <Button size="sm" variant="outline" onClick={decline}>Decline</Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CookieConsent;
