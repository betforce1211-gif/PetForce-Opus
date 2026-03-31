import { styled, XStack, YStack, Text } from "tamagui";
import type { ReactNode } from "react";

const Overlay = styled(YStack, {
  position: "absolute" as const,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "$pfOverlay",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 1000,
});

const ModalContainer = styled(YStack, {
  backgroundColor: "$petforceSurface",
  borderRadius: "$4",
  padding: "$5",
  shadowColor: "$pfShadow",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.15,
  shadowRadius: 16,
  elevation: 8,
  maxWidth: 480,
  width: "90%",

  variants: {
    size: {
      sm: { maxWidth: 360, padding: "$4" },
      md: { maxWidth: 480, padding: "$5" },
      lg: { maxWidth: 640, padding: "$5" },
    },
  } as const,

  defaultVariants: {
    size: "md",
  },
});

export function Modal({
  open,
  onClose,
  title,
  size,
  children,
}: {
  open: boolean;
  onClose?: () => void;
  title?: string;
  size?: "sm" | "md" | "lg";
  children: ReactNode;
}) {
  if (!open) return null;

  return (
    <Overlay onPress={onClose}>
      <ModalContainer size={size} onPress={(e: { stopPropagation: () => void }) => e.stopPropagation()}>
        {title && (
          <XStack justifyContent="space-between" alignItems="center" marginBottom="$3">
            <Text fontSize="$5" fontWeight="700" color="$petforceText">
              {title}
            </Text>
            {onClose && (
              <Text
                onPress={onClose}
                cursor="pointer"
                color="$petforceTextMuted"
                fontSize="$5"
                padding="$1"
              >
                {"\u2715"}
              </Text>
            )}
          </XStack>
        )}
        {children}
      </ModalContainer>
    </Overlay>
  );
}

export { ModalContainer, Overlay };
