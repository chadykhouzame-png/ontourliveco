import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { useGooglePlacesAutocomplete } from '@/hooks/useGooglePlacesAutocomplete';
import { cn } from '@/lib/utils';
import { MapPin, Loader2 } from 'lucide-react';

interface CityAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
  required?: boolean;
  className?: string;
}

const CityAutocomplete = ({
  value,
  onChange,
  placeholder = 'Sydney, Australia',
  id,
  required,
  className,
}: CityAutocompleteProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { predictions, isLoading, isReady, searchPlaces, clearPredictions, resetSessionToken } =
    useGooglePlacesAutocomplete({ types: ['(cities)'] });

  // Sync external value changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);
    
    if (newValue.length >= 2) {
      searchPlaces(newValue);
      setIsOpen(true);
    } else {
      clearPredictions();
      setIsOpen(false);
    }
  };

  const handleSelectPrediction = (prediction: { description: string }) => {
    setInputValue(prediction.description);
    onChange(prediction.description);
    setIsOpen(false);
    clearPredictions();
    resetSessionToken();
  };

  const handleFocus = () => {
    if (predictions.length > 0) {
      setIsOpen(true);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Input
          ref={inputRef}
          id={id}
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          placeholder={placeholder}
          required={required}
          className={cn('pr-8', className)}
          autoComplete="off"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {isLoading ? (
            <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
          ) : (
            <MapPin className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {isOpen && predictions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-auto">
          {predictions.map((prediction) => (
            <button
              key={prediction.placeId}
              type="button"
              onClick={() => handleSelectPrediction(prediction)}
              className="w-full px-3 py-2 text-left hover:bg-accent transition-colors flex items-center gap-2"
            >
              <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <div className="overflow-hidden">
                <span className="font-medium">{prediction.mainText}</span>
                {prediction.secondaryText && (
                  <span className="text-muted-foreground ml-1 text-sm">
                    {prediction.secondaryText}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {!isReady && (
        <p className="text-xs text-muted-foreground mt-1">Loading location services...</p>
      )}
    </div>
  );
};

export default CityAutocomplete;
