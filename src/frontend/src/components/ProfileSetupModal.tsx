import { useState } from 'react';
import { useSaveCallerUserProfile } from '../hooks/useQueries';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserCircle } from 'lucide-react';

export default function ProfileSetupModal() {
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const saveProfile = useSaveCallerUserProfile();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      await saveProfile.mutateAsync({ name: name.trim() });
    } catch (error) {
      console.error('Profile setup error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={true}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <UserCircle className="h-16 w-16 text-primary" />
          </div>
          <DialogTitle className="text-center">Welcome to FTTLR!</DialogTitle>
          <DialogDescription className="text-center">
            Please tell us your name to complete your profile setup.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="profile-name">Your Name</Label>
            <Input
              id="profile-name"
              placeholder="Enter your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <Button type="submit" className="w-full" disabled={!name.trim() || isSubmitting}>
            {isSubmitting ? 'Setting up...' : 'Continue'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
