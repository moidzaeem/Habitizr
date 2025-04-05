import { Checkbox } from "@/components/ui/checkbox"; // Assuming you have a Checkbox component
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form"; // Assuming you have these components

const daysOfWeek = [
  "Monday",   // 0
  "Tuesday",  // 1
  "Wednesday",// 2
  "Thursday", // 3
  "Friday",   // 4
  "Saturday", // 5
  "Sunday"    // 6
];

// Create a map of days to numbers
const daysToNumbers = {
  Sunday: 0,     // Sunday = 0
  Monday: 1,     // Monday = 1
  Tuesday: 2,    // Tuesday = 2
  Wednesday: 3,  // Wednesday = 3
  Thursday: 4,   // Thursday = 4
  Friday: 5,     // Friday = 5
  Saturday: 6,   // Saturday = 6
};

export default function SelectDaysComponent({ frequency, form }) {
  return (
    (frequency === "semi-daily" || frequency === "weekly") && (
      <FormField
        control={form.control}
        name="selectedDays"
        render={({ field }) => (
          <FormItem className="flex flex-col">
            <FormLabel>Select Days</FormLabel>
            <FormControl>
              <div className="grid grid-cols-2 gap-2">
                {daysOfWeek.map((day) => (
                  <div key={day} className="flex items-center space-x-2">
                    <Checkbox
                      checked={field.value.includes(daysToNumbers[day])}
                      onCheckedChange={(checked) => {
                        console.log(daysToNumbers[day]);
                        const dayNumber = daysToNumbers[day];
                        if (frequency === "weekly") {
                          if (checked) {
                            field.onChange([dayNumber]); // Only allow one day for weekly
                          } else {
                            field.onChange([]); // Clear selection if unchecked
                          }
                        } else if (frequency === "semi-daily") {
                          if (checked) {
                            field.onChange([...field.value, dayNumber]); // Add day number for semi-daily
                          } else {
                            field.onChange(field.value.filter((d) => d !== dayNumber)); // Remove day number for semi-daily
                          }
                        }
                      }}
                    />
                    <label>{day}</label>
                  </div>
                ))}
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    )
  );
}
