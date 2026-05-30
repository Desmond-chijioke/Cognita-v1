import { useState } from "react";
import {
  Anchor,
  Box,
  Button,
  PinInput,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { RiMailCheckLine } from "react-icons/ri";
import {
  showsucessnotification,
  showerrornotification,
} from "../../helper/notificationhelper";

interface Props {
  email: string;
  institutionName: string;
  onSuccess: () => void;
  onBack: () => void;
}

// Simulated valid OTP — replace with real API call
const MOCK_OTP = "123456";

export default function OtpVerification({
  email,
  institutionName,
  onSuccess,
  onBack,
}: Props) {
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const handleVerify = () => {
    if (otp.length < 6) {
      showerrornotification({ message: "Please enter the 6-digit code." });

      return;
    }

    setLoading(true);

    // Simulate async OTP check (replace with real API call)
    setTimeout(() => {
      setLoading(false);

      if (otp !== MOCK_OTP) {
        showerrornotification({
          message: "The code you entered is incorrect. Please try again.",
        });
        setOtp("");
        return;
      }

      showsucessnotification({
        message: `${institutionName}'s account is now active. Please log in to continue.`,
      });

      onSuccess();
    }, 1200);
  };

  const handleResend = () => {
    setOtp("");
    showsucessnotification({
      message: `A new verification code has been sent to ${email}. Please check your inbox.`,
    });
  };

  return (
    <Box style={{ maxWidth: 400, width: "100%", margin: "0 auto" }}>
      {/* Icon */}
      <Box mb="lg" style={{ display: "flex", justifyContent: "center" }}>
        <ThemeIcon size={64} radius="xl" color="brand" variant="light">
          <RiMailCheckLine size={34} />
        </ThemeIcon>
      </Box>

      {/* Header */}
      <Stack gap={6} mb="xl" style={{ textAlign: "center" }}>
        <Title
          order={2}
          style={{
            fontFamily: "Playfair Display, serif",
            letterSpacing: "-0.01em",
          }}
        >
          Verify your email
        </Title>
        <Text size="sm" c="dimmed">
          We sent a 6-digit code to
        </Text>
        <Text size="sm" fw={600} c="brand.7">
          {email}
        </Text>
        <Text size="xs" c="dimmed">
          Enter the code below to activate your account.
        </Text>
      </Stack>

      {/* PIN input */}
      <Stack gap="xl" align="center">
        <PinInput
          length={6}
          size="lg"
          type="number"
          value={otp}
          onChange={setOtp}
          oneTimeCode
          aria-label="OTP verification code"
        />

        <Button
          fullWidth
          size="md"
          radius="md"
          color="brand"
          loading={loading}
          disabled={otp.length < 6}
          onClick={handleVerify}
        >
          Verify &amp; Activate Account
        </Button>

        <Text size="sm" c="dimmed" ta="center">
          Didn't receive a code?{" "}
          <Anchor
            component="button"
            type="button"
            size="sm"
            c="brand.7"
            fw={600}
            onClick={handleResend}
          >
            Resend
          </Anchor>
        </Text>

        <Anchor
          component="button"
          type="button"
          size="sm"
          c="dimmed"
          onClick={onBack}
        >
          ← Back to registration
        </Anchor>
      </Stack>
    </Box>
  );
}
