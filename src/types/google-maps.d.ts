declare namespace google.maps.places {
  class AutocompleteService {
    getPlacePredictions(
      request: AutocompletionRequest,
      callback: (
        predictions: AutocompletePrediction[] | null,
        status: PlacesServiceStatus
      ) => void
    ): void;
  }

  class AutocompleteSessionToken {}

  interface AutocompletionRequest {
    input: string;
    sessionToken?: AutocompleteSessionToken;
    types?: string[];
    componentRestrictions?: { country: string | string[] };
  }

  interface AutocompletePrediction {
    place_id: string;
    description: string;
    structured_formatting: {
      main_text: string;
      secondary_text?: string;
    };
  }

  enum PlacesServiceStatus {
    OK = 'OK',
    ZERO_RESULTS = 'ZERO_RESULTS',
    INVALID_REQUEST = 'INVALID_REQUEST',
    OVER_QUERY_LIMIT = 'OVER_QUERY_LIMIT',
    REQUEST_DENIED = 'REQUEST_DENIED',
    UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  }
}

interface Window {
  google?: {
    maps?: {
      places?: {
        AutocompleteService: typeof google.maps.places.AutocompleteService;
        AutocompleteSessionToken: typeof google.maps.places.AutocompleteSessionToken;
        PlacesServiceStatus: typeof google.maps.places.PlacesServiceStatus;
      };
    };
  };
}
