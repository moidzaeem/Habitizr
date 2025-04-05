import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useHabits } from "@/hooks/use-habits";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  getTierLimit,
  isWithinTrialPeriod,
  TIERS,
  PRICING_TIERS,
} from "@/lib/tiers";
import { useUser } from "@/hooks/use-user";
import SelectDaysComponent from "./select-day-component";

const habitSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  frequency: z.enum(["daily", "semi-daily", "weekly"]),
  selectedDays: z.array(z.number()).optional(),
  reminderTime: z.string().min(1, "Reminder time is required"),
  timezone: z.string().min(1, "Timezone is required"),
});

type HabitFormData = z.infer<typeof habitSchema>;

interface HabitFormProps {
  initialData?: any;
  onSuccess?: () => void;
}

export default function HabitForm({ initialData, onSuccess }: HabitFormProps) {
  const { createHabit, updateHabit, isCreating, isUpdating, habits } =
    useHabits();
  const { user } = useUser();
  const { toast } = useToast();

  const form = useForm<HabitFormData>({
    resolver: zodResolver(habitSchema),
    defaultValues: initialData || {
      name: "",
      description: "",
      frequency: "daily",
      selectedDays: [],
      reminderTime: "09:00",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, // Added default timezone
    },
  });

  const onSubmit = async (data: HabitFormData) => {
    // console.log(data);
    // return;
    try {
      const tier = user?.packageType || TIERS.PATHFINDER;
      const isAdmin = user?.role === "admin";
      const habitLimit = getTierLimit(tier, isAdmin);

      if (!initialData && habits.length >= habitLimit && !isAdmin) {
        if (
          tier === TIERS.PATHFINDER &&
          !isWithinTrialPeriod(new Date(user?.createdAt!))
        ) {
          toast({
            variant: "destructive",
            title: "Trial Period Ended",
            description:
              "Your trial period has ended. Upgrade to Trailblazer to create more habits!",
          });
          return;
        } else if (tier === TIERS.PATHFINDER && habits.length >= habitLimit) {
          toast({
            variant: "destructive",
            title: "Pathfinder Plan Limit Reached",
            description:
              "Pathfinder plan allows only 1 habit. Upgrade to Trailblazer for up to 3 habits!",
          });
          return;
        } else if (
          (tier === TIERS.TRAILBLAZER || tier === TIERS.FREE) &&
          habits.length >= habitLimit
        ) {
          toast({
            variant: "destructive",
            title: "Maximum Habits Reached",
            description:
              "You've reached the maximum number of habits (3) for your plan.",
          });
          return;
        }
      }

      let formattedData = {
        ...data,
        selectedDays: data.selectedDays
          ? data.selectedDays
          : undefined,
      };

      if (initialData) {
        formattedData = {
          ...formattedData,
          // @ts-ignore
          id: initialData.id
        }
        await updateHabit(formattedData);
        toast({
          title: "Success",
          description: "Habit updated successfully",
        });
      } else {
        await createHabit(formattedData);
        form.reset();
        toast({
          title: "Success",
          description: "Habit created successfully",
        });
      }

      onSuccess?.();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to save habit",
      });
    }
  };

  const frequency = form.watch("frequency");

  //  This array needs to be populated with timezone data.  Consider using a library for this.
  const timezones = Intl.supportedValuesOf('timeZone').map(tz => tz);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Habit Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Daily Exercise" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe your habit goal..."
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="frequency"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Frequency</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="semi-daily">Semi-Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <SelectDaysComponent frequency={frequency} form={form} />

        <FormField
          control={form.control}
          name="reminderTime"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reminder Time</FormLabel>
              <FormControl>
                <Input type="time" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="timezone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Timezone</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value || Intl.DateTimeFormat().resolvedOptions().timeZone}>
                <SelectTrigger>
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  {timezones.map((tz) => {
                    // Get the current UTC offset for each timezone
                    const offset = new Date().toLocaleString("en-US", {
                      timeZone: tz,
                      hour12: false,
                      timeZoneName: "short",
                    }).split(" ")[2]; // Extract the UTC offset from the string (e.g., +03:00)

                    // Format the offset to show UTC ±hours
                    const formattedOffset = offset.startsWith("+")
                      ? `UTC ${offset}`
                      : `UTC ${offset}`;

                    return (
                      <SelectItem key={tz} value={tz}>
                        {tz} {formattedOffset}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />


        <Button
          type="submit"
          className="w-full"
          disabled={isCreating || isUpdating}
        >
          {isCreating || isUpdating
            ? "Saving..."
            : initialData
              ? "Update Habit"
              : "Create Habit"}
        </Button>

        {!initialData && (
          <p className="text-sm text-muted-foreground text-center">
            {user?.role === "admin" ? (
              "Admin account: Unlimited habits"
            ) : user?.packageType === TIERS.PATHFINDER ? (
              <>
                Pathfinder plan: {habits.length}/1 habits used
                {habits.length >= 1 && (
                  <Button
                    variant="link"
                    className="px-1 text-primary"
                    onClick={() => {
                      /* Add upgrade flow */
                    }}
                  >
                    Upgrade to Trailblazer
                  </Button>
                )}
              </>
            ) : (
              `${PRICING_TIERS[user?.packageType || TIERS.FREE].name} plan: ${habits.length}/3 habits used`
            )}
          </p>
        )}
      </form>
    </Form>
  );
}
