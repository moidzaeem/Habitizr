import React, { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import { format, eachDayOfInterval } from 'date-fns';
import 'react-calendar/dist/Calendar.css'; // Default calendar styles
import './habit-calander.css'; // Your custom styles for completed/missed

const HabitCalendar = ({ habit }) => {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [habitStatus, setHabitStatus] = useState({});
    const [formData, setFormData] = useState({
        completed: false,
    });

    useEffect(() => {
        if (!habit?.startedAt) return;

        const today = new Date();
        const startDate = new Date(habit.startedAt);

        // Get all dates from startDate to today
        const allDays = eachDayOfInterval({
            start: startDate,
            end: today,
        });

        // Mark all as missed by default
        const statusMap = allDays.reduce((acc, date) => {
            const formatted = format(date, 'yyyy-MM-dd');
            acc[formatted] = false;
            return acc;
        }, {});

        // Overwrite with completed dates
        const completions = habit.completions || [];
        completions.forEach((hab) => {
            const dateKey = format(new Date(hab.completedAt), 'yyyy-MM-dd');
            if (hab.completed) {
                statusMap[dateKey] = true;
            }
        });

        setHabitStatus(statusMap);
    }, [habit]);

    const tileClassName = ({ date }) => {
        const formattedDate = format(date, 'yyyy-MM-dd');
        if (habitStatus[formattedDate]) {
            return 'completed'; // Green
        } else if (habitStatus[formattedDate] === false) {
            return 'missed'; // Red
        }
        return ''; // Future or unknown
    };

    const handleDateChange = (date) => {
        console.log(date);


        setSelectedDate(date);
    };

    return (
        <div className="habit-calendar-container">
            <Calendar
                onChange={handleDateChange}
                value={selectedDate}
                maxDate={new Date()} // 🚫 disables future dates
                tileClassName={tileClassName}
            />
            {selectedDate && (
                <div className="modal-overlay" >
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h2 className="text-lg font-semibold mb-4">Edit Habit Response</h2>
                        <form className="space-y-4">
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
