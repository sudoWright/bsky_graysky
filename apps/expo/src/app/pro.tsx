import { useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  ScrollView,
  Text,
  TouchableHighlight,
  TouchableOpacity,
  View,
  type ImageSourcePropType,
  type ViewStyle,
} from "react-native";
import Purchases from "react-native-purchases";
import Animated, { ZoomIn } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { showToastable } from "react-native-toastable";
import { BlurView } from "expo-blur";
import { ImageBackground } from "expo-image";
import { Stack, useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckIcon,
  HeartIcon,
  LanguagesIcon,
  // LineChart,
  // MoreHorizontalIcon,
  PaletteIcon,
  XIcon,
} from "lucide-react-native";
import * as Sentry from "sentry-expo";
import colors from "tailwindcss/colors";

import { StatusBar } from "~/components/status-bar";
import { useAgent } from "~/lib/agent";
import { useCustomerInfo, useIsPro, useOfferings } from "~/lib/purchases";
import { cx } from "~/lib/utils/cx";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const background = require("../../assets/graysky.png") as ImageSourcePropType;

export default function Pro() {
  const offerings = useOfferings();
  const queryClient = useQueryClient();
  const router = useRouter();
  const customerInfo = useCustomerInfo();
  const isPro = useIsPro();
  const agent = useAgent();

  const [annual, setAnnual] = useState(false);

  const subscribe = useMutation({
    mutationKey: ["purchases", "subscribe"],
    mutationFn: async () => {
      if (!offerings.data) return "CANCELLED";
      if (__DEV__) {
        router.push("/success");
        return;
      }
      try {
        let plan;
        if (annual) {
          if (!offerings.data.current?.annual) throw Error("No annual package");
          plan = offerings.data.current.annual;
        } else {
          if (!offerings.data.current?.monthly)
            throw Error("No monthly package");
          plan = offerings.data.current.monthly;
        }
        await Purchases.setDisplayName(agent.session?.handle ?? null);
        const { customerInfo } = await Purchases.purchasePackage(plan);
        queryClient.setQueryData(["purchases", "info"], customerInfo);
      } catch (err) {
        // @ts-expect-error - rn-purchases doesn't seem to export error type
        if (err.userCancelled) return "CANCELLED";
        throw err;
      }
    },
    onSuccess: (res) => {
      if (res === "CANCELLED") return;
      router.push("/success");
    },
    onError: (err) => {
      console.error(err);
      Sentry.Native.captureException(err, { extra: { annual } });
      showToastable({
        title: "Could not complete purchase",
        message: "Something went wrong, please try again later.",
        status: "danger",
      });
    },
  });

  const restore = useMutation({
    mutationKey: ["purchases", "restore"],
    mutationFn: async () => {
      const customerInfo = await Purchases.restorePurchases();
      queryClient.setQueryData(["purchases", "info"], customerInfo);
    },
  });

  const features = [
    {
      colour: colors.blue[500],
      title: "Better translations",
      subtitle: "Translate posts using DeepL",
      icon: <LanguagesIcon className="text-white" />,
    },
    // {
    //   colour: "rgb(202, 138, 4)",
    //   title: "Analytics",
    //   subtitle: "See how your posts are doing",
    //   icon: <LineChart className="text-white" />,
    // },
    {
      colour: colors.green[500],
      title: "Custom themes",
      subtitle: "Change the accent colour",
      icon: <PaletteIcon className="text-white" />,
    },
    {
      colour: colors.red[500],
      title: "Support development",
      subtitle: "Help us keep the lights on",
      icon: <HeartIcon className="text-white" />,
    },
    // {
    //   colour: colors.amber[500],
    //   title: "And a lot more planned...",
    //   subtitle: "Analytics, polls, and much more",
    //   icon: <MoreHorizontalIcon className="text-white" />,
    // },
  ] satisfies Omit<FeatureItemProps, "index">[];

  const annualProduct = offerings.data?.current?.annual?.product;
  const monthlyProduct = offerings.data?.current?.monthly?.product;

  return (
    <View className="flex-1 bg-[#3B4245]">
      <StatusBar modal />
      <Stack.Screen
        options={{
          headerTransparent: true,
          headerRight: () => (
            <TouchableHighlight
              className="rounded-full"
              onPress={() => router.push("../")}
            >
              <View className="flex-1 rounded-full bg-neutral-800 p-2">
                <XIcon className="text-white" size={18} strokeWidth={3} />
              </View>
            </TouchableHighlight>
          ),
        }}
      />
      <ImageBackground className="flex-1" source={background} blurRadius={4}>
        <View className="flex-1 bg-black/40">
          <ScrollView fadingEdgeLength={20} indicatorStyle="white">
            <Animated.Text
              className="mb-8 mt-24 text-center text-6xl font-semibold text-white"
              entering={ZoomIn.delay(500).duration(300)}
            >
              Graysky Pro
            </Animated.Text>
            {features.map((feature, index) => (
              <FeatureItem key={feature.title} {...feature} index={index} />
            ))}
          </ScrollView>
          <SafeAreaView edges={["left", "bottom", "right"]} className="px-4">
            {isPro ? (
              <View>
                <View
                  className="w-full flex-row items-center justify-center rounded-xl bg-neutral-50 py-4"
                  style={{ borderCurve: "continuous" }}
                >
                  <CheckIcon className="mr-2 text-black" size={20} />
                  <Text className="text-center text-base font-medium text-black">
                    Currently subscribed
                    {customerInfo?.entitlements.active.pro?.periodType &&
                      ` (${customerInfo.entitlements.active.pro.periodType})`}
                  </Text>
                </View>
                {customerInfo?.managementURL && (
                  <Text
                    className="mb-4 mt-4 px-12 text-center text-sm text-white"
                    onPress={() =>
                      void Linking.openURL(customerInfo.managementURL!)
                    }
                  >
                    Manage my subscription
                  </Text>
                )}
              </View>
            ) : annualProduct && monthlyProduct ? (
              <View>
                <BlurPill active={!annual} onPress={() => setAnnual(false)}>
                  <View className="flex-row justify-between">
                    <Text className="text-base text-white">Monthly Plan</Text>
                    <Text className="text-base text-white">
                      {monthlyProduct.priceString} / month
                    </Text>
                  </View>
                  <Text className="mt-0.5 text-sm text-white/80">
                    Billed monthly, cancel anytime
                  </Text>
                </BlurPill>
                <BlurPill
                  active={annual}
                  onPress={() => setAnnual(true)}
                  className="mt-4"
                >
                  <View className="flex-row justify-between">
                    <View className="flex-row items-center">
                      <Text className="text-base text-white">Annual Plan</Text>
                      <View className="ml-2 rounded-md bg-green-300">
                        <Text className="py-0.5 pl-1.5 pr-1 text-xs font-bold text-green-950">
                          Save{" "}
                          {Math.round(
                            1000 -
                              (annualProduct.price /
                                (monthlyProduct.price * 12)) *
                                1000,
                          ) / 10}
                          %
                        </Text>
                      </View>
                    </View>
                    <Text className="text-base text-white">
                      {annualProduct.priceString} / year
                    </Text>
                  </View>
                  <Text className="mt-0.5 text-sm text-white/80">
                    Billed annually, cancel anytime
                  </Text>
                </BlurPill>
                <TouchableHighlight
                  onPress={() => subscribe.mutate()}
                  disabled={subscribe.isPending}
                  className="mt-4 rounded-xl"
                  style={{ borderCurve: "continuous" }}
                >
                  <View
                    className="min-h-[56px] w-full items-center rounded-xl bg-blue-500 py-4"
                    style={{ borderCurve: "continuous" }}
                  >
                    {subscribe.isPending ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text className="text-center text-base font-medium text-white">
                        Subscribe & pay
                      </Text>
                    )}
                  </View>
                </TouchableHighlight>
                <Text className="mt-3 px-4 text-xs text-neutral-200">
                  By subscribing, you agree to our{" "}
                  <Text
                    className="font-medium text-white underline"
                    onPress={() =>
                      Linking.openURL(
                        "https://graysky.app/terms-and-conditions",
                      )
                    }
                  >
                    Terms and Conditions
                  </Text>
                  {Platform.OS === "ios" ? (
                    <>
                      , the{" "}
                      <Text
                        className="font-medium text-white underline"
                        onPress={() =>
                          Linking.openURL(
                            "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/",
                          )
                        }
                      >
                        Terms of Use (EULA)
                      </Text>
                      , and our
                    </>
                  ) : (
                    " and"
                  )}{" "}
                  <Text
                    className="font-medium text-white underline"
                    onPress={() =>
                      Linking.openURL("https://graysky.app/privacy-policy")
                    }
                  >
                    Privacy Policy
                  </Text>
                  . Subscriptions renew automatically until cancelled.
                </Text>
                <TouchableOpacity
                  onPress={() => restore.mutate()}
                  disabled={restore.isPending}
                  className="mt-0.5 w-full py-2"
                >
                  <Text className="text-center text-base text-blue-500">
                    {restore.isPending
                      ? "Restoring purchases..."
                      : "Restore purchases"}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => restore.mutate()}
                disabled={restore.isPending}
                className="w-full py-4"
              >
                <Text className="text-center text-base text-blue-500">
                  {restore.isPending
                    ? "Restoring purchases..."
                    : "Restore purchases"}
                </Text>
              </TouchableOpacity>
            )}
          </SafeAreaView>
        </View>
      </ImageBackground>
    </View>
  );
}

interface FeatureItemProps {
  icon: React.ReactElement;
  title: string;
  subtitle: string;
  colour: string;
  index: number;
}

const FeatureItem = ({
  icon,
  title,
  subtitle,
  colour,
  index,
}: FeatureItemProps) => (
  <Animated.View
    className="flex-row items-center px-8 py-3"
    entering={ZoomIn.delay(750 + index * 300)}
  >
    <View
      className="h-10 w-10 items-center justify-center rounded"
      style={{ backgroundColor: colour }}
    >
      {icon}
    </View>
    <View className="flex-1 justify-center pl-4">
      <Text className="text-lg font-medium leading-5 text-white">{title}</Text>
      <Text className="text-base leading-5 text-white">{subtitle}</Text>
    </View>
  </Animated.View>
);

interface BlurPillProps {
  children: React.ReactNode;
  active?: boolean;
  className?: string;
  style?: ViewStyle;
  onPress?: () => void;
  disabled?: boolean;
}

const BlurPill = ({
  children,
  active,
  className,
  style,
  onPress,
  disabled,
}: BlurPillProps) => (
  <TouchableOpacity
    onPress={onPress}
    className={cx("rounded-xl", className)}
    style={style}
    disabled={disabled}
  >
    <View
      className="overflow-hidden rounded-xl"
      style={{ borderCurve: "continuous" }}
    >
      <BlurView tint="dark">
        <View
          className={cx(
            "rounded-xl border-2 px-4 py-2",
            active ? "border-blue-500" : "border-transparent",
          )}
        >
          {children}
        </View>
      </BlurView>
    </View>
  </TouchableOpacity>
);

export { ErrorBoundary } from "../components/error-boundary";
