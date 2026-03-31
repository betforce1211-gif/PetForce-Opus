import { YStack, XStack, Text, Input } from "tamagui";
import { useState } from "react";
import { Alert, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Card } from "@petforce/ui";

export default function SignInScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // TODO: Wire up Clerk auth with @clerk/clerk-expo
  const handleSignIn = () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Missing info", "Please enter email and password.");
      return;
    }
    Alert.alert("Coming soon", "Clerk auth integration pending. Add @clerk/clerk-expo to complete.");
  };

  return (
    <YStack flex={1} justifyContent="center" padding="$6" backgroundColor="$petforceBg">
      <YStack alignItems="center" marginBottom="$6">
        <Text fontSize={48}>🐾</Text>
        <Text fontSize="$8" fontWeight="bold" marginTop="$2">PetForce</Text>
        <Text color="$petforceTextMuted">Sign in to your account</Text>
      </YStack>

      <YStack gap="$3">
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
        <Pressable onPress={handleSignIn}>
          <Card
            backgroundColor="$petforcePrimary"
            padding="$3"
            alignItems="center"
            marginTop="$2"
          >
            <Text color="white" fontWeight="bold" fontSize="$4">Sign In</Text>
          </Card>
        </Pressable>
      </YStack>

      <XStack justifyContent="center" marginTop="$4" gap="$1">
        <Text color="$petforceTextMuted">Don't have an account?</Text>
        <Text
          color="$petforcePrimary"
          fontWeight="bold"
          onPress={() => router.replace("/auth/sign-up")}
        >
          Sign Up
        </Text>
      </XStack>
    </YStack>
  );
}
