"use client";

import type { ComponentProps } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@acme/ui";
import { buttonVariants } from "@acme/ui/button";

function Calendar({ className, classNames, ...props }: ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      navLayout="around"
      className={cn("w-full p-3", className)}
      classNames={{
        months: "flex flex-col space-y-4",
        month: "space-y-4",
        month_caption: "flex justify-center pt-1 relative items-center",
        caption_label: "text-sm font-medium text-[#DCE4E4]",
        nav: "space-x-1 flex items-center",
        button_previous: cn(
          buttonVariants({ variant: "outline" }),
          "hover:text-primary absolute top-4 left-4 z-10 h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 border-[#164B49]",
        ),
        button_next: cn(
          buttonVariants({ variant: "outline" }),
          "hover:text-primary absolute top-4 right-4 z-10 h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 border-[#164B49]",
        ),
        month_grid: "w-full border-collapse space-y-1",
        weekdays: "flex",
        weekday: "text-[#8FA8A8] rounded-md w-9 font-normal text-[0.8rem]",
        week: "flex w-full mt-2",
        day: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-primary/20 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal text-[#DCE4E4] aria-selected:opacity-100 hover:bg-[#164B49]/50 hover:text-[#DCE4E4]",
        ),
        range_end: "day-range-end",
        selected:
          "bg-primary text-[#0A1A1A] hover:bg-primary hover:text-[#0A1A1A] focus:bg-primary focus:text-[#0A1A1A]",
        today: "bg-primary/20 text-primary",
        outside: "day-outside text-[#4A6A6A] aria-selected:bg-accent/50 aria-selected:text-[#8FA8A8]",
        disabled: "text-[#4A6A6A] opacity-50",
        range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: (props) => {
          if (props.orientation === "left") {
            return <ChevronLeft className="h-4 w-4" />;
          }
          return <ChevronRight className="h-4 w-4" />;
        },
      }}
      {...props}
    />
  );
}

export { Calendar };
