import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useGetPhotos, useGetBannerPhotos, useAddPhotoToBanner, useRemovePhotoFromBanner, useUploadBannerPhoto, useDeleteBannerPhoto, useGetCallerUserProfile, useGetBannerPhotoCount, useGetAllBannerPhotoKeys } from '@/hooks/useQueries';
import { Image, Plus, X, Loader2, Info, Upload, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useState, useRef, useEffect } from 'react';
import { ExternalBlob } from '@/backend';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

export default function AdminBannerManager() {
  const { data: allPhotos = [], isLoading: photosLoading } = useGetPhotos();
  const { data: bannerPhotoKeys = [], isLoading: bannerLoading } = useGetBannerPhotos();
  const { data: allBannerKeys = [], isLoading: allKeysLoading } = useGetAllBannerPhotoKeys();
  const { data: bannerPhotoCount = BigInt(0), isLoading: countLoading, refetch: refetchCount } = useGetBannerPhotoCount();
  const { data: userProfile } = useGetCallerUserProfile();
  const addMutation = useAddPhotoToBanner();
  const removeMutation = useRemovePhotoFromBanner();
  const uploadMutation = useUploadBannerPhoto();
  const deleteMutation = useDeleteBannerPhoto();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [addingPhotoKey, setAddingPhotoKey] = useState<string | null>(null);
  const [removingPhotoKey, setRemovingPhotoKey] = useState<string | null>(null);
  const [deletingPhotoKey, setDeletingPhotoKey] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [dialogOpen, setDialogOpen] = useState<string | null>(null);

  const bannerPhotos = bannerPhotoKeys
    .map(key => {
      const found = allPhotos.find(([photoKey]) => photoKey === key);
      return found ? { key, photo: found[1] } : null;
    })
    .filter((item): item is { key: string; photo: any } => item !== null);

  const allBannerPhotosData = allBannerKeys
    .map(key => {
      const found = allPhotos.find(([photoKey]) => photoKey === key);
      return found ? { key, photo: found[1] } : null;
    })
    .filter((item): item is { key: string; photo: any } => item !== null);

  const availableBannerPhotos = allBannerPhotosData.filter(
    item => !bannerPhotoKeys.includes(item.key)
  );

  const totalBannerPhotos = Number(bannerPhotoCount);
  const canUploadMore = totalBannerPhotos < 20;

  useEffect(() => {
    refetchCount();
  }, [allBannerKeys.length, refetchCount]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image size must be less than 10MB');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    if (!userProfile?.name) {
      toast.error('User profile not found');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    const { data: currentCount } = await refetchCount();
    const count = Number(currentCount ?? BigInt(0));
    
    if (count >= 20) {
      toast.error('Maximum of 20 banner photos reached');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    try {
      setUploadProgress(1);
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const blob = ExternalBlob.fromBytes(uint8Array).withUploadProgress((percentage) => {
        setUploadProgress(percentage);
      });

      await uploadMutation.mutateAsync({
        blob,
        uploaderName: userProfile.name,
      });

      toast.success('Banner photo uploaded successfully!');
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      const errorMessage = error?.message || 'Failed to upload banner photo';
      toast.error(errorMessage);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleUploadClick = async () => {
    const { data: currentCount } = await refetchCount();
    const count = Number(currentCount ?? BigInt(0));
    
    if (count >= 20) {
      toast.error('Maximum of 20 banner photos reached. Delete photos to upload new ones.');
      return;
    }

    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleAddPhoto = async (photoKey: string) => {
    const { data: currentCount } = await refetchCount();
    const count = Number(currentCount ?? BigInt(0));
    
    if (count >= 20) {
      toast.error('Banner is full. Maximum of 20 photos allowed.');
      return;
    }

    setAddingPhotoKey(photoKey);
    try {
      await addMutation.mutateAsync(photoKey);
      toast.success('Photo added to banner');
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to add photo to banner';
      toast.error(errorMessage);
    } finally {
      setAddingPhotoKey(null);
    }
  };

  const handleRemovePhoto = async (photoKey: string) => {
    setRemovingPhotoKey(photoKey);
    try {
      await removeMutation.mutateAsync(photoKey);
      toast.success('Photo removed from banner');
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to remove photo from banner';
      toast.error(errorMessage);
    } finally {
      setRemovingPhotoKey(null);
    }
  };

  const handleDeletePhoto = async (photoKey: string) => {
    setDeletingPhotoKey(photoKey);
    try {
      await deleteMutation.mutateAsync(photoKey);
      toast.success('Banner photo deleted successfully');
      setDialogOpen(null);
    } catch (error: any) {
      console.error('Delete error:', error);
      const errorMessage = error?.message || 'Failed to delete banner photo';
      toast.error(errorMessage);
    } finally {
      setDeletingPhotoKey(null);
    }
  };

  if (photosLoading || bannerLoading || countLoading || allKeysLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            Banner Manager
          </CardTitle>
          <CardDescription>Manage photos displayed in the homepage banner</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Image className="h-5 w-5" />
              Banner Manager
            </CardTitle>
            <CardDescription>
              Upload and manage photos for the homepage banner ({totalBannerPhotos}/20 uploaded)
            </CardDescription>
          </div>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              aria-label="Upload banner photo"
            />
            <Button
              onClick={handleUploadClick}
              disabled={uploadMutation.isPending || !canUploadMore}
              size="sm"
              className="gap-2"
              type="button"
            >
              {uploadMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {uploadProgress > 0 ? `${uploadProgress}%` : 'Uploading...'}
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Upload Banner Photo
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Upload up to 20 photos for the banner. Select which photos to display on the homepage - they will auto-scroll every 3 seconds with smooth fade transitions.
            {!canUploadMore && (
              <span className="block mt-2 font-semibold text-destructive">
                Maximum of 20 banner photos reached. Delete photos below to upload new ones.
              </span>
            )}
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold">
            Currently Displayed in Banner ({bannerPhotos.length}/20)
          </h3>
          {bannerPhotos.length > 0 ? (
            <ScrollArea className="h-[200px] w-full rounded-md border p-4">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {bannerPhotos.map((item) => (
                  <div key={item.key} className="relative group">
                    <div className="aspect-video rounded-lg overflow-hidden border border-border">
                      <img
                        src={item.photo.blob.getDirectURL()}
                        alt="Banner photo"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <Button
                      size="icon"
                      variant="destructive"
                      className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleRemovePhoto(item.key)}
                      disabled={removingPhotoKey === item.key}
                      type="button"
                    >
                      {removingPhotoKey === item.key ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <X className="h-3 w-3" />
                      )}
                    </Button>
                    <p className="text-xs text-muted-foreground mt-1 text-center truncate">
                      {item.photo.uploaderName}
                    </p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-8 text-muted-foreground border rounded-md">
              <Image className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No photos selected for banner yet</p>
              <p className="text-xs mt-1">Upload photos and add them to the banner below</p>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Available Banner Photos ({availableBannerPhotos.length})</h3>
          {availableBannerPhotos.length > 0 ? (
            <ScrollArea className="h-[300px] w-full rounded-md border p-4">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {availableBannerPhotos.map((item) => (
                  <div key={item.key} className="relative group">
                    <div className="aspect-video rounded-lg overflow-hidden border border-border">
                      <img
                        src={item.photo.blob.getDirectURL()}
                        alt={`Photo by ${item.photo.uploaderName}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="icon"
                        variant="secondary"
                        className="h-6 w-6"
                        onClick={() => handleAddPhoto(item.key)}
                        disabled={addingPhotoKey === item.key || bannerPhotos.length >= 20}
                        title={bannerPhotos.length >= 20 ? 'Banner is full (max 20 photos)' : 'Add to banner'}
                        type="button"
                      >
                        {addingPhotoKey === item.key ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Plus className="h-3 w-3" />
                        )}
                      </Button>
                      <AlertDialog open={dialogOpen === item.key} onOpenChange={(open) => setDialogOpen(open ? item.key : null)}>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="icon"
                            variant="destructive"
                            className="h-6 w-6"
                            disabled={deletingPhotoKey === item.key}
                            type="button"
                          >
                            {deletingPhotoKey === item.key ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Trash2 className="h-3 w-3" />
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Banner Photo</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this banner photo uploaded by {item.photo.uploaderName}? This action cannot be undone and will remove the photo from both storage and the banner.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel disabled={deletingPhotoKey === item.key}>
                              Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={(e) => {
                                e.preventDefault();
                                handleDeletePhoto(item.key);
                              }}
                              disabled={deletingPhotoKey === item.key}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              {deletingPhotoKey === item.key ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                  Deleting...
                                </>
                              ) : (
                                'Delete'
                              )}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 text-center truncate">
                      {item.photo.uploaderName}
                    </p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="text-center py-8 text-muted-foreground border rounded-md">
              <Image className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">
                {!canUploadMore
                  ? 'Banner is full. Delete photos above to upload new ones.'
                  : 'No banner photos uploaded yet. Click "Upload Banner Photo" to add photos.'}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
