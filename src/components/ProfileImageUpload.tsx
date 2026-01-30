import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Camera, User, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ProfileImageUploadProps {
  currentImageUrl?: string | null;
  onImageUploaded: (url: string) => void;
  variant?: 'artist' | 'venue';
}

const ProfileImageUpload = ({ 
  currentImageUrl, 
  onImageUploaded,
  variant = 'artist'
}: ProfileImageUploadProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        variant: 'destructive',
        title: 'Invalid file type',
        description: 'Please upload an image file (JPG, PNG, etc.)',
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: 'destructive',
        title: 'File too large',
        description: 'Please upload an image smaller than 5MB',
      });
      return;
    }

    setIsUploading(true);

    try {
      // Create a preview
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);

      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/profile.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profile-images')
        .getPublicUrl(fileName);

      onImageUploaded(publicUrl);
      
      toast({
        title: 'Photo uploaded!',
        description: 'Your profile photo has been updated.',
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      setPreviewUrl(currentImageUrl || null);
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: error.message || 'Failed to upload image. Please try again.',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const accentColor = variant === 'artist' ? 'bg-artist' : 'bg-venue';

  return (
    <div className="flex flex-col items-center gap-3">
      <div 
        className="relative w-28 h-28 rounded-full overflow-hidden bg-secondary cursor-pointer group"
        onClick={() => fileInputRef.current?.click()}
      >
        {previewUrl ? (
          <img 
            src={previewUrl} 
            alt="Profile" 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <User className="w-12 h-12 text-muted-foreground" />
          </div>
        )}
        
        <div className={`absolute inset-0 ${accentColor}/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity`}>
          {isUploading ? (
            <Loader2 className="w-6 h-6 text-white animate-spin" />
          ) : (
            <Camera className="w-6 h-6 text-white" />
          )}
        </div>
      </div>
      
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        disabled={isUploading}
      >
        {isUploading ? 'Uploading...' : previewUrl ? 'Change photo' : 'Add photo'}
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
};

export default ProfileImageUpload;
