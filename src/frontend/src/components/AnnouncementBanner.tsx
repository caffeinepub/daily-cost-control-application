import { useEffect, useState } from 'react';
import { useGetBannerPhotos, useGetPhotos } from '@/hooks/useQueries';
import { Loader2 } from 'lucide-react';

export default function AnnouncementBanner() {
  const { data: bannerPhotoKeys = [], isLoading: keysLoading } = useGetBannerPhotos();
  const { data: allPhotos = [], isLoading: photosLoading } = useGetPhotos();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const bannerPhotos = bannerPhotoKeys
    .map(key => {
      const found = allPhotos.find(([photoKey]) => photoKey === key);
      return found ? { key, photo: found[1] } : null;
    })
    .filter((item): item is { key: string; photo: any } => item !== null);

  useEffect(() => {
    if (bannerPhotos.length <= 1) return;

    const interval = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % bannerPhotos.length);
        setIsTransitioning(false);
      }, 500);
    }, 3000);

    return () => clearInterval(interval);
  }, [bannerPhotos.length]);

  if (keysLoading || photosLoading) {
    return (
      <div className="w-full h-64 bg-muted flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (bannerPhotos.length === 0) {
    return null;
  }

  return (
    <div className="w-full h-64 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 overflow-hidden relative">
      <div className="absolute inset-0">
        {bannerPhotos.map((item, index) => (
          <div
            key={item.key}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              index === currentIndex && !isTransitioning ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <img
              src={item.photo.blob.getDirectURL()}
              alt={`Banner ${index + 1}`}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/20" />
          </div>
        ))}
      </div>
      
      {bannerPhotos.length > 1 && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 z-10">
          {bannerPhotos.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === currentIndex 
                  ? 'bg-white w-6' 
                  : 'bg-white/50 hover:bg-white/75'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
