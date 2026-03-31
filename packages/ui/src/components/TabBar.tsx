import { styled, XStack, YStack, Text } from "tamagui";

const TabBarContainer = styled(XStack, {
  backgroundColor: "$petforceSurface",
  borderTopWidth: 1,
  borderTopColor: "$pfBorder",
  paddingBottom: "$2",
  paddingTop: "$1",
});

const TabItem = styled(YStack, {
  flex: 1,
  alignItems: "center",
  justifyContent: "center",
  padding: "$1",
  cursor: "pointer",
  gap: 2,
});

export type Tab = {
  key: string;
  label: string;
  icon: string;
};

export function TabBar({
  tabs,
  activeTab,
  onTabPress,
}: {
  tabs: Tab[];
  activeTab: string;
  onTabPress?: (key: string) => void;
}) {
  return (
    <TabBarContainer>
      {tabs.map((tab) => {
        const active = tab.key === activeTab;
        return (
          <TabItem key={tab.key} onPress={() => onTabPress?.(tab.key)}>
            <Text fontSize={20}>{tab.icon}</Text>
            <Text
              fontSize="$1"
              fontWeight={active ? "700" : "400"}
              color={active ? "$petforcePrimary" : "$petforceTextMuted"}
            >
              {tab.label}
            </Text>
          </TabItem>
        );
      })}
    </TabBarContainer>
  );
}

export { TabBarContainer };
