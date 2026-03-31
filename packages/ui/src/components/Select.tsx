import { Text, XStack, YStack, styled } from "tamagui";
import { useState, type ReactNode } from "react";

const SelectTrigger = styled(XStack, {
  backgroundColor: "$petforceSurface",
  borderWidth: 1,
  borderColor: "$pfBorder",
  borderRadius: "$3",
  padding: "$3",
  alignItems: "center",
  justifyContent: "space-between",
  cursor: "pointer",
  pressStyle: { borderColor: "$petforcePrimary" },

  variants: {
    inputSize: {
      sm: { height: 36, padding: "$2" },
      md: { height: 44, padding: "$3" },
      lg: { height: 52, padding: "$3.5" },
    },
  } as const,

  defaultVariants: {
    inputSize: "md",
  },
});

const OptionItem = styled(XStack, {
  padding: "$3",
  cursor: "pointer",
  hoverStyle: { backgroundColor: "$pfHighlight" },
  pressStyle: { backgroundColor: "$pfHighlight" },
});

export type SelectOption = { label: string; value: string };

export function Select({
  options,
  value,
  onValueChange,
  placeholder = "Select...",
  inputSize = "md",
  children,
}: {
  options: SelectOption[];
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  inputSize?: "sm" | "md" | "lg";
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <YStack position="relative">
      <SelectTrigger inputSize={inputSize} onPress={() => setOpen(!open)}>
        <Text
          color={selected ? "$petforceText" : "$petforceTextMuted"}
          fontSize="$3"
        >
          {selected?.label ?? placeholder}
        </Text>
        <Text color="$petforceTextMuted" fontSize="$2">
          {open ? "\u25B2" : "\u25BC"}
        </Text>
      </SelectTrigger>
      {open && (
        <YStack
          position="absolute"
          top="100%"
          left={0}
          right={0}
          zIndex={100}
          backgroundColor="$petforceSurface"
          borderWidth={1}
          borderColor="$pfBorder"
          borderRadius="$3"
          marginTop="$1"
          overflow="hidden"
          elevation={4}
        >
          {options.map((opt) => (
            <OptionItem
              key={opt.value}
              onPress={() => {
                onValueChange?.(opt.value);
                setOpen(false);
              }}
            >
              <Text
                color="$petforceText"
                fontWeight={opt.value === value ? "700" : "400"}
              >
                {opt.label}
              </Text>
            </OptionItem>
          ))}
          {children}
        </YStack>
      )}
    </YStack>
  );
}
