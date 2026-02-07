import { useGetSchedule, useCreateSession, useUpdateSession, useDeleteSession, useIsCallerAdmin, useIsScoreAuthAdmin } from '../hooks/useQueries';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, Clock, Plus, Edit, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { SessionInput, WeeklySession } from '../backend';

interface WeeklyScheduleProps {
  preview?: boolean;
}

export default function WeeklySchedule({ preview = false }: WeeklyScheduleProps) {
  const { data: sessions, isLoading } = useGetSchedule();
  const { data: isAdmin } = useIsCallerAdmin();
  const { data: isScoreAuthAdmin } = useIsScoreAuthAdmin();
  const addSession = useCreateSession();
  const updateSession = useUpdateSession();
  const deleteSession = useDeleteSession();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [sessionType, setSessionType] = useState('Practice');
  const [sessionDate, setSessionDate] = useState('');
  const [sessionTime, setSessionTime] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingSession, setEditingSession] = useState<WeeklySession | null>(null);

  const displaySessions = preview ? sessions?.slice(0, 3) : sessions;
  const canManageSessions = isAdmin || isScoreAuthAdmin;

  const handleAddSession = async () => {
    if (!sessionDate || !sessionTime) return;

    setIsSubmitting(true);
    try {
      const dateTime = new Date(`${sessionDate}T${sessionTime}`);
      const sessionInput: SessionInput = {
        date: BigInt(dateTime.getTime() * 1_000_000),
        sessionType,
        notes: notes.trim(),
      };
      await addSession.mutateAsync(sessionInput);
      setDialogOpen(false);
      setSessionDate('');
      setSessionTime('');
      setNotes('');
      setSessionType('Practice');
    } catch (error) {
      console.error('Add session error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSession = (session: WeeklySession) => {
    setEditingSession(session);
    const date = new Date(Number(session.date) / 1_000_000);
    setSessionDate(date.toISOString().split('T')[0]);
    setSessionTime(date.toTimeString().slice(0, 5));
    setSessionType(session.sessionType);
    setNotes(session.notes);
    setEditDialogOpen(true);
  };

  const handleUpdateSession = async () => {
    if (!editingSession || !sessionDate || !sessionTime) return;

    setIsSubmitting(true);
    try {
      const dateTime = new Date(`${sessionDate}T${sessionTime}`);
      const sessionInput: SessionInput = {
        date: BigInt(dateTime.getTime() * 1_000_000),
        sessionType,
        notes: notes.trim(),
      };
      await updateSession.mutateAsync({ date: editingSession.date, session: sessionInput });
      setEditDialogOpen(false);
      setEditingSession(null);
      setSessionDate('');
      setSessionTime('');
      setNotes('');
      setSessionType('Practice');
    } catch (error) {
      console.error('Update session error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSession = async (date: bigint) => {
    if (!confirm('Are you sure you want to delete this session?')) return;

    try {
      await deleteSession.mutateAsync(date);
    } catch (error) {
      console.error('Delete session error:', error);
    }
  };

  const formatDate = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) / 1_000_000);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const formatTime = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) / 1_000_000);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Weekly Schedule
          </CardTitle>
          <CardDescription>Loading schedule...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
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
              <Calendar className="h-5 w-5" />
              Weekly Schedule
            </CardTitle>
            <CardDescription>Upcoming Sunday practice and match sessions</CardDescription>
          </div>
          {canManageSessions && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Session
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Session</DialogTitle>
                  <DialogDescription>
                    Schedule a new practice or match session for the fellowship.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="type">Session Type</Label>
                    <Select value={sessionType} onValueChange={setSessionType}>
                      <SelectTrigger id="type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Practice">Practice</SelectItem>
                        <SelectItem value="Match">Match</SelectItem>
                        <SelectItem value="Tournament">Tournament</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="date">Date</Label>
                      <Input
                        id="date"
                        type="date"
                        value={sessionDate}
                        onChange={(e) => setSessionDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="time">Time</Label>
                      <Input
                        id="time"
                        type="time"
                        value={sessionTime}
                        onChange={(e) => setSessionTime(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes (Optional)</Label>
                    <Textarea
                      id="notes"
                      placeholder="Add any additional information..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddSession} disabled={!sessionDate || !sessionTime || isSubmitting}>
                    {isSubmitting ? 'Adding...' : 'Add Session'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!sessions || sessions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No sessions scheduled yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {displaySessions?.map((session, index) => (
              <div
                key={index}
                className="p-4 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-foreground">{session.sessionType}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {formatDate(session.date)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {formatTime(session.date)}
                      </span>
                    </div>
                    {session.notes && (
                      <p className="text-sm text-muted-foreground mt-2">{session.notes}</p>
                    )}
                  </div>
                  {canManageSessions && !preview && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditSession(session)}
                        className="h-8 w-8"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteSession(session.date)}
                        className="h-8 w-8 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {preview && sessions && sessions.length > 3 && (
              <div className="text-center pt-2">
                <Button variant="link">
                  View all sessions →
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>

      {/* Edit Session Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Session</DialogTitle>
            <DialogDescription>
              Update the session details.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-type">Session Type</Label>
              <Select value={sessionType} onValueChange={setSessionType}>
                <SelectTrigger id="edit-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Practice">Practice</SelectItem>
                  <SelectItem value="Match">Match</SelectItem>
                  <SelectItem value="Tournament">Tournament</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-date">Date</Label>
                <Input
                  id="edit-date"
                  type="date"
                  value={sessionDate}
                  onChange={(e) => setSessionDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-time">Time</Label>
                <Input
                  id="edit-time"
                  type="time"
                  value={sessionTime}
                  onChange={(e) => setSessionTime(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-notes">Notes (Optional)</Label>
              <Textarea
                id="edit-notes"
                placeholder="Add any additional information..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateSession} disabled={!sessionDate || !sessionTime || isSubmitting}>
              {isSubmitting ? 'Updating...' : 'Update Session'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
