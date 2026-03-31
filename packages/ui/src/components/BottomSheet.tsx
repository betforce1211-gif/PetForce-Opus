import { styled, YStack, XStack } from "tamagui";
import type { ReactNode } from "react";

const SheetOverlay = styled(YStack, {
  position: "absolute" as const,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "$pfOverlay",
  justifyContent: "flex-end",
  zIndex: 1000,
});

const SheetContainer = styled(YStack, {
  backgroundColor: "$petforceSurface",
  borderTopLeftRadius: "$5",
  borderTopRightRadius: "$5",
  padding: "$4",
  paddingTop: "$3",
  shadowColor: "$pfShadow",
  shadowOffset: { width: 0, height: -2 },
  shadowOpacity: 0.1,
  shadowRadius: 12,
  elevation: 8,
  maxHeight: "80%",

  variants: {
    snapPoint: {
      quarter: { maxHeight: "25%" },
      half: { maxHeight: "50%" },
      full: { maxHeight: "90%" },
    },
  } as const,
});

const Handle = styled(XStack, {
  width: 36,
  height: 4,
  borderRadius: "$10",
  backgroundColor: "$pfBorderStrong",
  alignSelf: "center",
  marginBottom: "$3",
});

export function BottomSheet({
  open,
  onClose,
  snapPoint,
  children,
}: {
  open: boolean;
  onClose?: () => void;
  snapPoint?: "quarter" | "half" | "full";
  children: ReactNode;
}) {
  if (!open) return null;

  return (
    <SheetOverlay onPress={onClose}>
      <SheetContainer
        snapPoint={snapPoint}
        onPress={(e: { stopPropagation: () => void }) => e.stopPropagation()}
      >
        <Handle />
        {children}
      </SheetContainer>
    </SheetOverlay>
  );
}

export { SheetContainer, SheetOverlay, Handle };
