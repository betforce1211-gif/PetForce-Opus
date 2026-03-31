import { styled, XStack, Input, Text } from "tamagui";

const SearchContainer = styled(XStack, {
  backgroundColor: "$pfHighlight",
  borderRadius: "$4",
  paddingHorizontal: "$3",
  alignItems: "center",
  gap: "$2",
  height: 44,
});

export function SearchBar({
  value,
  onChangeText,
  placeholder = "Search...",
  onSubmit,
}: {
  value?: string;
  onChangeText?: (text: string) => void;
  placeholder?: string;
  onSubmit?: () => void;
}) {
  return (
    <SearchContainer>
      <Text color="$petforceTextMuted" fontSize="$3">
        {"\uD83D\uDD0D"}
      </Text>
      <Input
        flex={1}
        backgroundColor="transparent"
        borderWidth={0}
        fontSize="$3"
        color="$petforceText"
        placeholderTextColor="$petforceTextMuted"
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        returnKeyType="search"
        onSubmitEditing={onSubmit}
      />
      {value && value.length > 0 && (
        <Text
          onPress={() => onChangeText?.("")}
          cursor="pointer"
          color="$petforceTextMuted"
          fontSize="$3"
          padding="$1"
        >
          {"\u2715"}
        </Text>
      )}
    </SearchContainer>
  );
}

export { SearchContainer };
