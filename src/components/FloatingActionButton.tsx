import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Music, Building2, Search, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const FloatingActionButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const { user, userRole } = useAuth();

  const toggleOpen = () => setIsOpen(!isOpen);

  const actions = user
    ? userRole === 'artist'
      ? [
          { icon: Calendar, label: 'Travel Dates', path: '/artist/travel', color: 'bg-artist' },
          { icon: Search, label: 'Find Venues', path: '/search', color: 'bg-venue' },
        ]
      : userRole === 'venue'
      ? [
          { icon: Search, label: 'Find Artists', path: '/search', color: 'bg-artist' },
          { icon: Calendar, label: 'Post Request', path: '/venue/dashboard', color: 'bg-venue' },
        ]
      : [
          { icon: Music, label: 'Join as Artist', path: '/join/artist', color: 'bg-artist' },
          { icon: Building2, label: 'Join as Venue', path: '/join/venue', color: 'bg-venue' },
        ]
    : [
        { icon: Search, label: 'Browse Artists', path: '/search', color: 'bg-primary' },
        { icon: Music, label: 'Join as Artist', path: '/join/artist', color: 'bg-artist' },
        { icon: Building2, label: 'Join as Venue', path: '/join/venue', color: 'bg-venue' },
      ];

  const handleAction = (path: string) => {
    navigate(path);
    setIsOpen(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 md:hidden">
      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/60 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Action buttons */}
      <AnimatePresence>
        {isOpen && (
          <div className="absolute bottom-16 right-0 flex flex-col-reverse gap-3 items-end">
            {actions.map((action, index) => (
              <motion.button
                key={action.label}
                initial={{ opacity: 0, scale: 0.3, y: 20 }}
                animate={{ 
                  opacity: 1, 
                  scale: 1, 
                  y: 0,
                  transition: { 
                    delay: index * 0.05,
                    type: 'spring',
                    stiffness: 400,
                    damping: 25
                  }
                }}
                exit={{ 
                  opacity: 0, 
                  scale: 0.3, 
                  y: 20,
                  transition: { delay: (actions.length - index - 1) * 0.03 }
                }}
                onClick={() => handleAction(action.path)}
                className="flex items-center gap-3 group"
                whileTap={{ scale: 0.95 }}
              >
                <span className="px-3 py-2 bg-card/90 backdrop-blur-xl rounded-lg text-sm font-medium text-foreground shadow-lg border border-border/50">
                  {action.label}
                </span>
                <div className={`w-12 h-12 ${action.color} rounded-full flex items-center justify-center shadow-lg`}>
                  <action.icon className="w-5 h-5 text-primary-foreground" />
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* Main FAB */}
      <motion.button
        onClick={toggleOpen}
        className="w-14 h-14 bg-primary rounded-full flex items-center justify-center shadow-lg shadow-primary/30"
        whileTap={{ scale: 0.9 }}
        animate={{ 
          rotate: isOpen ? 45 : 0,
          backgroundColor: isOpen ? 'hsl(var(--muted))' : 'hsl(var(--primary))'
        }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      >
        {isOpen ? (
          <X className="w-6 h-6 text-foreground" />
        ) : (
          <Plus className="w-6 h-6 text-primary-foreground" />
        )}
      </motion.button>
    </div>
  );
};

export default FloatingActionButton;
