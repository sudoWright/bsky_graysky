import { Text } from "react-native";
import { Switch } from "react-native-gesture-handler";

import { GroupedList } from "~/components/grouped-list";
import { useAppPreferences } from "~/lib/hooks/preferences";
import { useIsPro } from "~/lib/hooks/purchases";
import { LANGUAGES } from "~/lib/utils/locale/languages";

export default function LanguageSettings() {
  const [
    { primaryLanguage, contentLanguages, translationMethod },
    setAppPrefs,
  ] = useAppPreferences();
  const isPro = useIsPro();

  const translationService = isPro ? translationMethod : "GOOGLE";

  const primaryLanguageLabel =
    LANGUAGES.find((lang) => lang.code2 === primaryLanguage)?.name ??
    primaryLanguage;

  return (
    <GroupedList
      groups={[
        {
          title: "Post languages",
          options: [
            {
              title: "Primary language",
              href: "/settings/language/primary",
              chevron: true,
              action: (
                <Text className="text-base text-neutral-500">
                  {primaryLanguageLabel}
                </Text>
              ),
            },
          ],
          footer:
            "This is the language that posts will be translated into, if they're not in your content languages. Temporarily, this is also the language that your posts will be marked as - this will change in the future.",
        },
        {
          options: [
            {
              title: "Content languages",
              href: "/settings/language/content",
              chevron: true,
              action: (
                <Text className="text-base text-neutral-500">
                  {contentLanguages
                    .map(
                      (contentLang) =>
                        LANGUAGES.find((lang) => lang.code2 === contentLang)
                          ?.name ?? contentLang,
                    )
                    .join(", ")}
                </Text>
              ),
            },
          ],
          footer: "Posts in these languages will not be translated.",
        },
        {
          title: "Translation provider",
          options: [
            {
              title: "Use DeepL for translations",
              disabled: !isPro,
              action: (
                <Switch
                  value={translationService === "DEEPL"}
                  onValueChange={(useDeepL) => {
                    setAppPrefs({
                      translationMethod: useDeepL ? "DEEPL" : "GOOGLE",
                    });
                  }}
                  accessibilityHint="Use DeepL for translations instead of Google Translate"
                />
              ),
            },
          ],
          footer: isPro
            ? "Google Translate is used otherwise."
            : "Get Graysky Pro for access to DeepL translations. Google Translate is used otherwise.",
        },
      ]}
    />
  );
}
