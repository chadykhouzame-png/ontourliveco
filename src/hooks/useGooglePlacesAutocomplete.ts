import { useEffect, useRef, useState, useCallback } from 'react';

interface PlacePrediction {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
}

interface UseGooglePlacesAutocompleteOptions {
  types?: string[];
  componentRestrictions?: { country: string | string[] };
}

export const useGooglePlacesAutocomplete = (options: UseGooglePlacesAutocompleteOptions = {}) => {
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      console.warn('Google Places API key not found');
      return;
    }

    // Check if script is already loaded
    if (window.google?.maps?.places) {
      autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService();
      sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
      setIsReady(true);
      return;
    }

    // Load Google Maps script
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService();
      sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
      setIsReady(true);
    };
    script.onerror = () => {
      console.error('Failed to load Google Maps script');
    };
    document.head.appendChild(script);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const searchPlaces = useCallback((input: string) => {
    if (!input || input.length < 2) {
      setPredictions([]);
      return;
    }

    if (!autocompleteServiceRef.current || !isReady) {
      return;
    }

    // Debounce the search
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      setIsLoading(true);
      
      autocompleteServiceRef.current?.getPlacePredictions(
        {
          input,
          sessionToken: sessionTokenRef.current!,
          types: options.types || ['(cities)'],
          ...(options.componentRestrictions && { componentRestrictions: options.componentRestrictions }),
        },
        (results, status) => {
          setIsLoading(false);
          
          if (status === google.maps.places.PlacesServiceStatus.OK && results) {
            setPredictions(
              results.map((result) => ({
                placeId: result.place_id,
                description: result.description,
                mainText: result.structured_formatting.main_text,
                secondaryText: result.structured_formatting.secondary_text || '',
              }))
            );
          } else {
            setPredictions([]);
          }
        }
      );
    }, 300);
  }, [isReady, options.types, options.componentRestrictions]);

  const clearPredictions = useCallback(() => {
    setPredictions([]);
  }, []);

  const resetSessionToken = useCallback(() => {
    if (window.google?.maps?.places) {
      sessionTokenRef.current = new window.google.maps.places.AutocompleteSessionToken();
    }
  }, []);

  return {
    predictions,
    isLoading,
    isReady,
    searchPlaces,
    clearPredictions,
    resetSessionToken,
  };
};
