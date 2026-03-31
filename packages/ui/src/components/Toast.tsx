import { styled, XStack, Text } from "tamagui";
import { useEffect, useState } from "react";

const ToastContainer = styled(XStack, {
  backgroundColor: "$petforceSurface",
  borderRadius: "$3",
  padding: "$3",
  paddingHorizontal: "$4",
  alignItems: "center",
  gap: "$2",
  shadowColor: "$pfShadow",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.15,
  shadowRadius: 12,
  elevation: 6,
  borderLeftWidth: 4,

  variants: {
    variant: {
      success: { borderLeftColor: "$green10" },
      error: { borderLeftColor: "$red10" },
      warning: { borderLeftColor: "$orange10" },
      info: { borderLeftColor: "$petforcePrimary" },
    },
  } as const,

  defaultVariants: {
    variant: "info",
  },
});

const ICONS: Record<string, string> = {
  success: "\u2705",
  error: "\u274C",
  warning: "\u26A0\uFE0F",
  info: "\u2139\uFE0F",
};

export function Toast({
  message,
  variant = "info",
  visible,
  duration = 3000,
  onDismiss,
}: {
  message: string;
  variant?: "success" | "error" | "warning" | "info";
  visible: boolean;
  duration?: number;
  onDismiss?: () => void;
}) {
  const [show, setShow] = useState(visible);

  useEffect(() => {
    setShow(visible);
    if (visible && duration > 0) {
      const timer = setTimeout(() => {
        setShow(false);
        onDismiss?.();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [visible, duration, onDismiss]);

  if (!show) return null;

  return (
    <ToastContainer variant={variant}>
      <Text fontSize="$3">{ICONS[variant]}</Text>
      <Text fontSize="$3" color="$petforceText" flex={1}>
        {message}
      </Text>
      {onDismiss && (
        <Text
          onPress={() => {
            setShow(false);
            onDismiss();
          }}
          cursor="pointer"
          color="$petforceTextMuted"
          fontSize="$2"
        >
          {"\u2715"}
        </Text>
      )}
    </ToastContainer>
  );
}

export { ToastContainer };
