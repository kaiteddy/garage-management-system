'use client';

import { useState, useEffect } from 'react';
import { format, addDays, isBefore, isAfter } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon, Bell, BellOff, CheckCircle, XCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate } from './utils';

type Reminder = {
  id: string;
  registration: string;
  make?: string;
  model?: string;
  dueDate: Date;
  reminderDate: Date;
  isActive: boolean;
  createdAt: Date;
};

interface MOTRemindersProps {
  registration: string;
  make?: string;
  model?: string;
  expiryDate?: string;
}

export function MOTReminders({ registration, make, model, expiryDate }: MOTRemindersProps) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState<Date | undefined>(expiryDate ? new Date(expiryDate) : undefined);
  const [reminderDate, setReminderDate] = useState<Date | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Load reminders from localStorage on component mount
  useEffect(() => {
    try {
      const savedReminders = localStorage.getItem('motReminders');
      if (savedReminders) {
        const parsedReminders = JSON.parse(savedReminders);
        // Convert string dates back to Date objects
        const formattedReminders = parsedReminders.map((r: any) => ({
          ...r,
          dueDate: new Date(r.dueDate),
          reminderDate: new Date(r.reminderDate),
          createdAt: new Date(r.createdAt)
        }));
        setReminders(formattedReminders);
      }
    } catch (error) {
      console.error('Failed to load reminders:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Save reminders to localStorage whenever they change
  useEffect(() => {
    if (!loading) {
      localStorage.setItem('motReminders', JSON.stringify(reminders));
      
      // Set up browser notifications
      reminders.forEach(reminder => {
        if (reminder.isActive && isBefore(new Date(), reminder.reminderDate)) {
          const timeUntilReminder = reminder.reminderDate.getTime() - Date.now();
          if (timeUntilReminder > 0) {
            const timeoutId = setTimeout(() => {
              showNotification(reminder);
            }, timeUntilReminder);
            
            return () => clearTimeout(timeoutId);
          }
        }
      });
    }
  }, [reminders, loading]);

  const showNotification = (reminder: Reminder) => {
    if (Notification.permission === 'granted') {
      new Notification(`MOT Reminder: ${reminder.registration}`, {
        body: `Your MOT for ${reminder.make || ''} ${reminder.model || ''} is due soon!`,
        icon: '/icon-192x192.png',
        tag: `mot-reminder-${reminder.id}`
      });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          showNotification(reminder);
        }
      });
    }
  };

  const handleAddReminder = () => {
    if (!date) return;
    
    // Default reminder date is 30 days before the due date
    const defaultReminderDate = addDays(date, -30);
    const newReminder: Reminder = {
      id: `rem-${Date.now()}`,
      registration,
      make,
      model,
      dueDate: date,
      reminderDate: reminderDate || defaultReminderDate,
      isActive: true,
      createdAt: new Date()
    };
    
    setReminders(prev => [...prev, newReminder]);
    setReminderDate(undefined);
    
    // Request notification permission if not already granted
    if (Notification.permission !== 'granted') {
      Notification.requestPermission();
    }
  };

  const toggleReminder = (id: string) => {
    setReminders(prev => 
      prev.map(reminder => 
        reminder.id === id 
          ? { ...reminder, isActive: !reminder.isActive } 
          : reminder
      )
    );
  };

  const deleteReminder = (id: string) => {
    setReminders(prev => prev.filter(reminder => reminder.id !== id));
  };

  const filteredReminders = reminders.filter(reminder => {
    if (activeTab === 'upcoming') {
      return reminder.isActive && isAfter(reminder.dueDate, new Date());
    } else if (activeTab === 'past') {
      return isBefore(reminder.dueDate, new Date());
    } else {
      return !reminder.isActive;
    }
  });

  const sortedReminders = [...filteredReminders].sort((a, b) => 
    a.dueDate.getTime() - b.dueDate.getTime()
  );

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
                <div className="h-3 bg-muted rounded w-2/3"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Set Reminder</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="due-date">MOT Due Date</Label>
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    id="due-date"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(selectedDate) => {
                      setDate(selectedDate);
                      setIsCalendarOpen(false);
                    }}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="reminder-date">Remind me on</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="reminder-date"
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !reminderDate && "text-muted-foreground"
                    )}
                    disabled={!date}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {reminderDate ? (
                      format(reminderDate, "PPP")
                    ) : date ? (
                      `${format(addDays(date, -30), "PPP")} (30 days before)`
                    ) : (
                      <span>Select due date first</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={reminderDate}
                    onSelect={setReminderDate}
                    disabled={(date) => !date || date >= (date || new Date())}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="flex items-end">
              <Button 
                className="w-full" 
                onClick={handleAddReminder}
                disabled={!date || isSubmitting}
              >
                {isSubmitting ? 'Adding...' : 'Add Reminder'}
              </Button>
            </div>
          </div>
          
          <div className="mt-4 text-sm text-muted-foreground">
            <p>We'll remind you via browser notification and email (if provided).</p>
          </div>
        </CardContent>
      </Card>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">
            {activeTab === 'upcoming' ? 'Upcoming Reminders' : 
             activeTab === 'past' ? 'Past Due' : 'Inactive Reminders'}
          </h3>
          
          <div className="flex space-x-1 rounded-md bg-muted p-1">
            <Button
              variant={activeTab === 'upcoming' ? 'default' : 'ghost'}
              size="sm"
              className="h-8 px-3 text-xs"
              onClick={() => setActiveTab('upcoming')}
            >
              Upcoming
            </Button>
            <Button
              variant={activeTab === 'past' ? 'default' : 'ghost'}
              size="sm"
              className="h-8 px-3 text-xs"
              onClick={() => setActiveTab('past')}
            >
              Past Due
            </Button>
            <Button
              variant={activeTab === 'inactive' ? 'default' : 'ghost'}
              size="sm"
              className="h-8 px-3 text-xs"
              onClick={() => setActiveTab('inactive')}
            >
              Inactive
            </Button>
          </div>
        </div>
        
        {sortedReminders.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <Clock className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
            <h4 className="text-sm font-medium">No {activeTab} reminders</h4>
            <p className="text-sm text-muted-foreground mt-1">
              {activeTab === 'upcoming' 
                ? 'Add a reminder to get notified before your MOT is due.'
                : activeTab === 'past'
                  ? 'All your reminders are up to date.'
                  : 'No inactive reminders.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedReminders.map(reminder => (
              <div 
                key={reminder.id}
                className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50"
              >
                <div className="flex items-start space-x-4">
                  <button
                    onClick={() => toggleReminder(reminder.id)}
                    className={cn(
                      "mt-1 flex h-5 w-5 items-center justify-center rounded-full border",
                      reminder.isActive 
                        ? "border-green-500 bg-green-500 text-white" 
                        : "border-muted-foreground/30"
                    )}
                  >
                    {reminder.isActive && <CheckCircle className="h-3.5 w-3.5" />}
                  </button>
                  
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="font-medium">
                        {reminder.make || 'Vehicle'} {reminder.model || reminder.registration}
                      </h4>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-sm text-muted-foreground">
                        {reminder.registration}
                      </span>
                    </div>
                    
                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                      <div className="flex items-center">
                        <CalendarIcon className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                        <span>Due: {format(reminder.dueDate, 'MMM d, yyyy')}</span>
                      </div>
                      
                      <div className="flex items-center">
                        <Bell className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                        <span>Reminder: {format(reminder.reminderDate, 'MMM d, yyyy')}</span>
                      </div>
                      
                      {isBefore(reminder.dueDate, new Date()) && (
                        <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                          Overdue
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => deleteReminder(reminder.id)}
                  >
                    <XCircle className="h-4 w-4 text-muted-foreground" />
                    <span className="sr-only">Delete</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
