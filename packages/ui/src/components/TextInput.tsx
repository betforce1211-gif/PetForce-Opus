import { Input, type GetProps } from "tamagui";

type InputProps = GetProps<typeof Input>;

const sizeStyles: Record<string, Partial<InputProps>> = {
  sm: { height: 36, fontSize: "$2", padding: "$2" },
  md: { height: 44, fontSize: "$3", padding: "$3" },
  lg: { height: 52, fontSize: "$4", padding: "$3.5" as InputProps["padding"] },
};

export function TextInput({
  variant = "default",
  inputSize = "md",
  ...props
}: InputProps & {
  variant?: "default" | "error";
  inputSize?: "sm" | "md" | "lg";
}) {
  const isError = variant === "error";
  return (
    <Input
      backgroundColor="$petforceSurface"
      borderWidth={1}
      borderColor={isError ? "$red10" : "$pfBorder"}
      borderRadius="$3"
      padding="$3"
      fontSize="$3"
      color="$petforceText"
      placeholderTextColor="$petforceTextMuted"
      focusStyle={{
        borderColor: isError ? "$red10" : "$petforcePrimary",
      }}
      {...sizeStyles[inputSize]}
      {...props}
    />
  );
}
