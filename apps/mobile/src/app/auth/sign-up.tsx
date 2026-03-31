import { YStack, XStack, Text, Input } from "tamagui";
import { useState } from "react";
import { Alert, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Card } from "@petforce/ui";

export default function SignUpScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");

  // TODO: Wire up Clerk auth with @clerk/clerk-expo
  const handleSignUp = () => {
    if (!email.trim() || !password.trim() || !displayName.trim()) {
      Alert.alert("Missing info", "Please fill in all fields.");
      return;
    }
    Alert.alert("Coming soon", "Clerk auth integration pending. Add @clerk/clerk-expo to complete.");
  };

  return (
    <YStack flex={1} justifyContent="center" padding="$6" backgroundColor="$petforceBg">
      <YStack alignItems="center" marginBottom="$6">
        <Text fontSize={48}>🐾</Text>
        <Text fontSize="$8" fontWeight="bold" marginTop="$2">PetForce</Text>
        <Text color="$petforceTextMuted">Create your account</Text>
      </YStack>

      <YStack gap="$3">
        <Input
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Display Name"
          borderColor="$pfBorder"
        />
        <Input
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          keyboardType="email-address"
          autoCapitalize="none"
          borderColor="$pfBorder"
        />
        <Input
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          secureTextEntry
          borderColor="$pfBorder"
        />
        <Pressable onPress={handleSignUp}>
          <Card
            backgroundColor="$petforcePrimary"
            padding="$3"
            alignItems="center"
            marginTop="$2"
          >
            <Text color="white" fontWeight="bold" fontSize="$4">Sign Up</Text>
          </Card>
        </Pressable>
      </YStack>

      <XStack justifyContent="center" marginTop="$4" gap="$1">
        <Text color="$petforceTextMuted">Already have an account?</Text>
        <Text
          color="$petforcePrimary"
          fontWeight="bold"
          onPress={() => router.replace("/auth/sign-in")}
        >
          Sign In
        </Text>
      </XStack>
    </YStack>
  );
}
