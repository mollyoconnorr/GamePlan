import dayjs, { type Dayjs } from "dayjs";

/**
 * Selectable time option used by time pickers.
 */
export type TimeOption = {
    value: string;
    label: string;
};

// Build HH:mm / h:mm A options from the configured daily calendar window.
export const buildTimeOptions = (
    startTime: Dayjs,
    endTime: Dayjs,
    stepMinutes: number
): TimeOption[] => {
    if (stepMinutes <= 0 || endTime.isBefore(startTime)) {
        return [];
    }

    const options: TimeOption[] = [];
    let current = startTime;

    while (current.isBefore(endTime) || current.isSame(endTime)) {
        options.push({
            value: current.format("HH:mm"),
            label: current.format("h:mm A"),
        });

        current = current.add(stepMinutes, "minute");
    }

    return options;
};

// For past days, no options are valid. For today, keep only slots at/after now.
export const filterPastTimesForDate = (
    options: TimeOption[],
    selectedDate: Dayjs | null,
    now: Dayjs = dayjs()
): TimeOption[] => {
    if (!selectedDate) {
        return options;
    }

    if (selectedDate.isBefore(now, "day")) {
        return [];
    }

    if (selectedDate.isAfter(now, "day")) {
        return options;
    }

    return options.filter((option) => {
        const [hour, minute] = option.value.split(":").map(Number);
        if (Number.isNaN(hour) || Number.isNaN(minute)) {
            return false;
        }

        const optionDateTime = selectedDate
            .hour(hour)
            .minute(minute)
            .second(0)
            .millisecond(0);

        return !optionDateTime.isBefore(now);
    });
};
