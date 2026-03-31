import { Text, XStack, YStack, styled } from "tamagui";
import { useState, useMemo } from "react";

const DateButton = styled(XStack, {
  backgroundColor: "$petforceSurface",
  borderWidth: 1,
  borderColor: "$pfBorder",
  borderRadius: "$3",
  padding: "$3",
  alignItems: "center",
  justifyContent: "space-between",
  cursor: "pointer",
  pressStyle: { borderColor: "$petforcePrimary" },
  height: 44,
});

const DayCell = styled(XStack, {
  width: 36,
  height: 36,
  borderRadius: "$2",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  hoverStyle: { backgroundColor: "$pfHighlight" },

  variants: {
    selected: {
      true: {
        backgroundColor: "$petforcePrimary",
        hoverStyle: { backgroundColor: "$petforcePrimary" },
      },
    },
    today: {
      true: {
        borderWidth: 1,
        borderColor: "$petforcePrimary",
      },
    },
  } as const,
});

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function formatDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function DatePicker({
  value,
  onDateChange,
  placeholder = "Pick a date",
}: {
  value?: Date;
  onDateChange?: (date: Date) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(value ?? new Date());
  const today = useMemo(() => formatDate(new Date()), []);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const numDays = daysInMonth(year, month);
  const firstDow = new Date(year, month, 1).getDay();
  const cells: (number | null)[] = Array(firstDow).fill(null);
  for (let d = 1; d <= numDays; d++) cells.push(d);

  const navigate = (delta: number) => {
    setViewDate(new Date(year, month + delta, 1));
  };

  return (
    <YStack position="relative">
      <DateButton onPress={() => setOpen(!open)}>
        <Text
          color={value ? "$petforceText" : "$petforceTextMuted"}
          fontSize="$3"
        >
          {value ? formatDate(value) : placeholder}
        </Text>
        <Text color="$petforceTextMuted">{"\uD83D\uDCC5"}</Text>
      </DateButton>

      {open && (
        <YStack
          position="absolute"
          top="100%"
          left={0}
          zIndex={100}
          backgroundColor="$petforceSurface"
          borderWidth={1}
          borderColor="$pfBorder"
          borderRadius="$3"
          padding="$3"
          marginTop="$1"
          elevation={4}
          minWidth={280}
        >
          <XStack justifyContent="space-between" alignItems="center" marginBottom="$2">
            <Text
              onPress={() => navigate(-1)}
              cursor="pointer"
              padding="$1"
              color="$petforcePrimary"
              fontWeight="700"
            >
              {"\u25C0"}
            </Text>
            <Text fontWeight="700" color="$petforceText">
              {viewDate.toLocaleString("default", { month: "long" })} {year}
            </Text>
            <Text
              onPress={() => navigate(1)}
              cursor="pointer"
              padding="$1"
              color="$petforcePrimary"
              fontWeight="700"
            >
              {"\u25B6"}
            </Text>
          </XStack>

          <XStack>
            {DAYS.map((d) => (
              <XStack key={d} width={36} justifyContent="center">
                <Text fontSize="$1" color="$petforceTextMuted" fontWeight="600">
                  {d}
                </Text>
              </XStack>
            ))}
          </XStack>

          <XStack flexWrap="wrap">
            {cells.map((day, i) => {
              if (day === null) return <XStack key={`e-${i}`} width={36} height={36} />;
              const cellDate = new Date(year, month, day);
              const cellStr = formatDate(cellDate);
              const isSelected = value ? formatDate(value) === cellStr : false;
              const isToday = cellStr === today;
              return (
                <DayCell
                  key={day}
                  selected={isSelected}
                  today={isToday && !isSelected}
                  onPress={() => {
                    onDateChange?.(cellDate);
                    setOpen(false);
                  }}
                >
                  <Text
                    fontSize="$2"
                    color={isSelected ? "white" : "$petforceText"}
                  >
                    {day}
                  </Text>
                </DayCell>
              );
            })}
          </XStack>
        </YStack>
      )}
    </YStack>
  );
}
