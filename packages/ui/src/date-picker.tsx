"use client";

import { format } from "date-fns";
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@acme/ui";
import { Button, buttonVariants } from "@acme/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@acme/ui/popover";

interface DatePickerProps {
  date?: Date;
  onDateChange?: (date: Date | undefined) => void;
  placeholder?: string;
  className?: string;
}

export function DatePicker({
  date,
  onDateChange,
  placeholder = "Pick a date",
  className,
}: DatePickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "PPP") : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <DayPicker
          navLayout="around"
          mode="single"
          selected={date}
          onSelect={onDateChange}
          className="w-full p-3"
          classNames={{
            months: "flex flex-row space-y-4 sm:space-x-4 sm:space-y-0",
            month: "space-y-4",
            month_caption: "flex justify-center pt-1 relative items-center",
            caption_label: "text-sm font-medium",
            nav: "space-x-1 flex items-center",
            button_previous: cn(
              buttonVariants({ variant: "outline" }),
              "hover:text-primary absolute top-4 left-4 z-10 h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
            ),
            button_next: cn(
              buttonVariants({ variant: "outline" }),
              "hover:text-primary absolute top-4 right-4 z-10 h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
            ),
            month_grid: "w-full border-collapse space-y-1",
            weekdays: "flex",
            weekday:
              "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
            week: "flex w-full mt-2",
            day: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
            day_button: cn(
              buttonVariants({ variant: "ghost" }),
              "h-9 w-9 p-0 font-normal aria-selected:opacity-100",
            ),
            range_end: "day-range-end",
            selected:
              "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
            today: "bg-primary text-accent-foreground opacity-50 aria-selected:opacity-100",
            outside:
              "day-outside text-muted-foreground aria-selected:bg-accent/50 aria-selected:text-muted-foreground",
            disabled: "text-muted-foreground opacity-50",
            range_middle:
              "aria-selected:bg-accent aria-selected:text-accent-foreground",
            hidden: "invisible",
          }}
          components={{
            Chevron: (props) => {
              if (props.orientation === "left") {
                return <ChevronLeft className="h-4 w-4" />;
              }
              return <ChevronRight className="h-4 w-4" />;
            },
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
