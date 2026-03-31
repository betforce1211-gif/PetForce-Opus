import { YStack, XStack, Text, Input, Spinner } from "tamagui";
import { useState, useCallback } from "react";
import { Alert, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useSignUp } from "@clerk/clerk-expo";
import { Card } from "@petforce/ui";

export default function SignUpScreen() {
  const router = useRouter();
  const { signUp, setActive, isLoaded } = useSignUp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignUp = useCallback(async () => {
    if (!isLoaded) return;
    if (!email.trim() || !password.trim() || !displayName.trim()) {
      Alert.alert("Missing info", "Please fill in all fields.");
      return;
    }

    setLoading(true);
    try {
      const result = await signUp.create({
        emailAddress: email.trim(),
        password: password.trim(),
        firstName: displayName.trim(),
      });

      if (result.status === "complete" && result.createdSessionId) {
        await setActive({ session: result.createdSessionId });
        router.replace("/onboard");
      } else {
        // Clerk may require email verification — handle the pending state
        Alert.alert(
          "Check your email",
          "We sent a verification link. Please verify and sign in."
        );
        router.replace("/auth/sign-in");
      }
    } catch (err: any) {
      const msg =
        err?.errors?.[0]?.longMessage ??
        err?.errors?.[0]?.message ??
        "Sign up failed. Please try again.";
      Alert.alert("Error", msg);
    } finally {
      setLoading(false);
    }
  }, [isLoaded, signUp, setActive, email, password, displayName, router]);

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
          editable={!loading}
        />
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
        <Pressable onPress={handleSignUp} disabled={loading}>
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
              <Text color="white" fontWeight="bold" fontSize="$4">Sign Up</Text>
            )}
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
