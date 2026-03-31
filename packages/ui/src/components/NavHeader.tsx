import { styled, XStack, Text } from "tamagui";
import type { ReactNode } from "react";

const HeaderBar = styled(XStack, {
  backgroundColor: "$petforceSurface",
  height: 56,
  paddingHorizontal: "$4",
  alignItems: "center",
  justifyContent: "space-between",
  borderBottomWidth: 1,
  borderBottomColor: "$pfBorder",

  variants: {
    transparent: {
      true: {
        backgroundColor: "transparent",
        borderBottomWidth: 0,
      },
    },
  } as const,
});

export function NavHeader({
  title,
  left,
  right,
  transparent,
}: {
  title?: string;
  left?: ReactNode;
  right?: ReactNode;
  transparent?: boolean;
}) {
  return (
    <HeaderBar transparent={transparent}>
      <XStack flex={1} alignItems="center">
        {left}
      </XStack>
      {title && (
        <Text fontSize="$4" fontWeight="700" color="$petforceText">
          {title}
        </Text>
      )}
      <XStack flex={1} alignItems="center" justifyContent="flex-end">
        {right}
      </XStack>
    </HeaderBar>
  );
}

export { HeaderBar };
