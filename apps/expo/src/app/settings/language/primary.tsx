import { useState } from "react";
import { Stack, useRouter } from "expo-router";
import { useTheme } from "@react-navigation/native";
import { CheckIcon } from "lucide-react-native";

import { GroupedList } from "~/components/grouped-list";
import { TransparentHeaderUntilScrolled } from "~/components/transparent-header";
import { useAppPreferences } from "~/lib/hooks/preferences";
import { useSearchBarOptions } from "~/lib/hooks/search-bar";
import { SELECTABLE_LANGUAGES } from "~/lib/utils/locale/languages";

export default function PrimaryLanguageSettings() {
  const [{ primaryLanguage, contentLanguages }, setAppPrefs] =
    useAppPreferences();
  const theme = useTheme();
  const router = useRouter();

  const [query, setQuery] = useState("");
  const headerSearchBarOptions = useSearchBarOptions({
    placeholder: "Search languages",
    onChangeText: (evt) => setQuery(evt.nativeEvent.text),
  });

  return (
    <>
      <Stack.Screen options={{ headerSearchBarOptions }} />
      <TransparentHeaderUntilScrolled>
        <GroupedList
          groups={[
            {
              options: SELECTABLE_LANGUAGES.filter((l) =>
                Boolean(l.code2) && query
                  ? l.name
                      .toLocaleLowerCase()
                      .includes(query.toLocaleLowerCase())
                  : true,
              ).map((lang) => ({
                title: lang.name,
                onPress: () => {
                  setAppPrefs({
                    primaryLanguage: lang.code2,
                    contentLanguages: contentLanguages.includes(lang.code2)
                      ? contentLanguages
                      : [...contentLanguages, lang.code2],
                  });
                  router.back();
                },
                action:
                  lang.code2 === primaryLanguage ? (
                    <CheckIcon color={theme.colors.primary} size={20} />
                  ) : null,
              })),
            },
          ]}
        />
      </TransparentHeaderUntilScrolled>
    </>
  );
}
