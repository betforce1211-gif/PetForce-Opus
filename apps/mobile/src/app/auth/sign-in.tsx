import { YStack, XStack, Text, Input, Spinner } from "tamagui";
import { useState, useCallback } from "react";
import { Alert, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useSignIn } from "@clerk/clerk-expo";
import { Card } from "@petforce/ui";

export default function SignInScreen() {
  const router = useRouter();
  const { signIn, setActive, isLoaded } = useSignIn();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignIn = useCallback(async () => {
    if (!isLoaded) return;
    if (!email.trim() || !password.trim()) {
      Alert.alert("Missing info", "Please enter email and password.");
      return;
    }

    setLoading(true);
    try {
      const result = await signIn.create({
        identifier: email.trim(),
        password: password.trim(),
      });

      if (result.status === "complete" && result.createdSessionId) {
        await setActive({ session: result.createdSessionId });
        router.replace("/(tabs)");
      } else {
        Alert.alert("Sign in incomplete", "Please complete all required steps.");
      }
    } catch (err: any) {
      const msg =
        err?.errors?.[0]?.longMessage ??
        err?.errors?.[0]?.message ??
        "Sign in failed. Please try again.";
      Alert.alert("Error", msg);
    } finally {
      setLoading(false);
    }
  }, [isLoaded, signIn, setActive, email, password, router]);

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
          editable={!loading}
        />
        <Input
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          secureTextEntry
          borderColor="$pfBorder"
          editable={!loading}
        />
        <Pressable onPress={handleSignIn} disabled={loading}>
          <Card
            backgroundColor="$petforcePrimary"
            padding="$3"
            alignItems="center"
            marginTop="$2"
            opacity={loading ? 0.6 : 1}
          >
            {loading ? (
              <Spinner color="white" />
            ) : (
              <Text color="white" fontWeight="bold" fontSize="$4">Sign In</Text>
            )}
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
