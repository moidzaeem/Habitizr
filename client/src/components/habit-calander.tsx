import React, { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import { format, eachDayOfInterval } from 'date-fns';
import 'react-calendar/dist/Calendar.css';
import './habit-calander.css'; // Custom styles
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../hooks/use-toast';
import { formatInTimeZone } from 'date-fns-tz';


type Habit = {
    id: string;
    name: string;
    startedAt: string;
    completions: { completedAt: string; completed: boolean }[];
};

type UpdateCompletionInput = {
    habitId: string;
    completedAt: string;
    completed: boolean;
};

const HabitCalendar = ({ habit }: { habit: Habit }) => {

    const queryClient = useQueryClient();
    const { toast } = useToast();
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [habitStatus, setHabitStatus] = useState<{ [key: string]: boolean }>({});
    const [formData, setFormData] = useState({ completed: false });

    useEffect(() => {

        const today = new Date();
        const startDate = new Date(habit.startedAt);

        const allDays = eachDayOfInterval({
            start: startDate,
            end: today,
        });

        const statusMap = allDays.reduce((acc, date) => {
            const formatted = format(date, 'yyyy-MM-dd');
            acc[formatted] = false;
            return acc;
        }, {});

        habit.completions.forEach((entry) => {
            // const dateKey = format(new Date(entry.completedAt), 'yyyy-MM-dd');
            const dateKey = formatInTimeZone(new Date(entry.completedAt), 'UTC', 'yyyy-MM-dd');

            console.log('Entry:', entry);
            console.log('Date Key:', dateKey);
            if (entry.completed) {
                statusMap[dateKey] = true;
            }
        });

        console.log('Status Map:', statusMap);

        setHabitStatus(statusMap);
    }, [habit]);

    const tileClassName = ({ date }: { date: Date }) => {
        const formatted = format(date, 'yyyy-MM-dd');
        if (habitStatus[formatted]) return 'completed'; // Completed habit
        if (habitStatus[formatted] === false) return 'missed'; // Missed habit
        return '';
    };

    const handleDateChange = (date: Date) => {
        const formattedDate = format(date, 'yyyy-MM-dd');
        if (formattedDate > format(new Date(), 'yyyy-MM-dd')) return; // Disallow future dates

        setSelectedDate(date);
        setFormData({ completed: habitStatus[formattedDate] || false });
    };

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedDate) return;

        updateCompletion.mutate({
            habitId: habit.id,
            completedAt: format(selectedDate, 'yyyy-MM-dd'),
            completed: formData.completed,
        });

        setSelectedDate(null); // Close the modal after submission
    };

    const updateCompletion = useMutation({
        mutationFn: async ({ habitId, completedAt, completed }: UpdateCompletionInput) => {
            const response = await fetch(`/api/habits/${habitId}/completions`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ completedAt, completed }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to update completion');
            }

            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/habits'] });
            toast({
                variant: 'default',
                title: 'Updated!',
                description: 'Habit completion updated successfully.',
            });
        },
        onError: (error: Error) => {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error.message,
            });
        },
    });

    const formattedDate = selectedDate ? format(selectedDate, 'MMMM d, yyyy') : '';

    return (
        <div>
            <div className="habit-calendar-container">
                <Calendar
                    onChange={handleDateChange}
                    value={selectedDate}
                    minDate={new Date(habit.startedAt)}
                    maxDate={new Date()}
                    tileClassName={tileClassName}
                />
            </div>

            {selectedDate && (
                <div className="modal-overlay" onClick={() => setSelectedDate(null)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h2 className="text-lg font-semibold mb-2">Edit Habit Response</h2>
                        <p className="text-sm text-gray-600 mb-4">
                            You are updating this habit - <strong>{habit.name}</strong> for the date{' '}
                            <strong>{formattedDate}</strong>
                        </p>

                        <form onSubmit={handleFormSubmit} className="space-y-4">
                            <label className="block">
                                <input
                                    type="checkbox"
                                    checked={formData.completed}
                                    onChange={(e) =>
                                        setFormData({ ...formData, completed: e.target.checked })
                                    }
                                />
                                <span className="ml-2">Completed</span>
                            </label>

                            <div className="flex justify-end gap-2">
                                <button type="submit" className="btn-primary">
                                    Save
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HabitCalendar;
