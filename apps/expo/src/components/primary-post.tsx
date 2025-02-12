import { Fragment, useMemo, useState } from "react";
import { TouchableOpacity, View } from "react-native";
import { Link, useRouter } from "expo-router";
import {
  AppBskyFeedPost,
  AppBskyFeedThreadgate,
  type AppBskyActorDefs,
  type AppBskyFeedDefs,
  type AppBskyGraphDefs,
} from "@atproto/api";
import { useTheme } from "@react-navigation/native";
import { MessagesSquareIcon } from "lucide-react-native";

import { useAbsolutePath } from "~/lib/absolute-path-context";
import { useAppPreferences } from "~/lib/hooks/preferences";
import { locale } from "~/lib/locale";
import { cx } from "~/lib/utils/cx";
import { isPostInLanguage } from "~/lib/utils/locale/helpers";
import { Embed } from "./embed";
import { PostActionRow } from "./post-action-row";
import { PostAvatar } from "./post-avatar";
import { PostContextMenu } from "./post-context-menu";
import { RichText } from "./rich-text";
import { Text } from "./themed/text";
import { Translation } from "./translation";

interface Props {
  post: AppBskyFeedDefs.PostView;
  hasParent?: boolean;
  dataUpdatedAt: number;
}

export const PrimaryPost = ({ post, hasParent, dataUpdatedAt }: Props) => {
  const theme = useTheme();
  const [forceShowTranslation, setForceShowTranslation] = useState<
    string | null
  >(null);
  const path = useAbsolutePath();

  const postAuthorDisplayName = post.author.displayName;
  const postAuthorHandle = post.author.handle;
  const profileHref = path(`/profile/${post.author.did}`);

  const [{ contentLanguages }] = useAppPreferences();

  const needsTranslation = useMemo(
    () => !isPostInLanguage(post, contentLanguages),
    [post, contentLanguages],
  );

  if (!AppBskyFeedPost.isRecord(post.record)) {
    return null;
  }

  let threadgate;

  if (post.threadgate) {
    const record = post.threadgate.record;
    if (AppBskyFeedThreadgate.isRecord(record)) {
      threadgate = record;
    }
  }

  return (
    <View
      className={cx(
        "border-b px-4 pb-4 pt-3",
        hasParent && "border-t",
        theme.dark
          ? "border-neutral-800 bg-black"
          : "border-neutral-200 bg-white",
      )}
    >
      <View className="mb-2 flex-row items-center">
        <PostAvatar profile={post.author} />
        <View className="justify ml-3 flex-1 flex-row items-center">
          <Link
            href={profileHref}
            accessibilityHint="Opens profile"
            accessibilityLabel={`${
              postAuthorDisplayName ?? ""
            } @${postAuthorHandle}`}
            asChild
          >
            <TouchableOpacity className="flex-1">
              <Text numberOfLines={1} className="text-base font-semibold">
                {postAuthorDisplayName}
              </Text>
              <Text
                numberOfLines={1}
                className="text-base leading-5 text-neutral-500 dark:text-neutral-400"
              >
                @{postAuthorHandle}
              </Text>
            </TouchableOpacity>
          </Link>
          <PostContextMenu
            post={{ ...post, record: post.record }}
            showSeeLikes
            showSeeReposts
            showCopyText
            onTranslate={
              needsTranslation
                ? undefined
                : () => setForceShowTranslation(post.uri)
            }
          />
        </View>
      </View>
      {!!post.record.text && (
        <>
          <View className="flex-1 lg:pr-24">
            <RichText
              text={post.record.text}
              facets={post.record.facets}
              size="lg"
              selectable
            />
          </View>
          {(needsTranslation || forceShowTranslation) && (
            <View className="mt-1">
              <Translation
                uri={post.uri}
                text={post.record.text}
                forceShow={forceShowTranslation === post.uri}
              />
            </View>
          )}
        </>
      )}
      {/* embeds */}
      {post.embed && (
        <View className="flex-1">
          <Embed uri={post.uri} content={post.embed} truncate={false} />
        </View>
      )}
      {/* actions */}
      <PostActionRow post={post} dataUpdatedAt={dataUpdatedAt} className="mt-4">
        <Text className="-mt-1.5 text-sm text-neutral-500 dark:text-neutral-400">
          {new Intl.DateTimeFormat(locale.languageTag, {
            timeStyle: "short",
            dateStyle: "short",
          })
            .format(new Date(post.record.createdAt))
            .split(",")
            .reverse()
            .join(" · ")}
        </Text>
      </PostActionRow>
      {/* threadgate info */}
      {post.threadgate && threadgate && (
        <View className="mt-2 flex-1 flex-row rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 dark:border-blue-700 dark:bg-blue-950">
          <MessagesSquareIcon
            size={20}
            color={theme.colors.text}
            className="mt-0.5 shrink-0"
          />
          <View className="ml-3 flex-1">
            <Text className="text-base font-medium">Who can reply?</Text>
            <ThreadgateInfo
              author={post.author}
              threadgate={threadgate}
              lists={post.threadgate.lists}
            />
          </View>
        </View>
      )}
    </View>
  );
};

const ThreadgateInfo = ({
  threadgate,
  author,
  lists,
}: {
  threadgate: AppBskyFeedThreadgate.Record;
  author: AppBskyActorDefs.ProfileViewBasic;
  lists?: AppBskyGraphDefs.ListViewBasic[];
}) => {
  const path = useAbsolutePath();
  const router = useRouter();
  const theme = useTheme();

  if (!threadgate.allow || threadgate.allow.length === 0) {
    return <Text className="text-base">Nobody can reply</Text>;
  }

  const renderRule = (
    rule:
      | AppBskyFeedThreadgate.MentionRule
      | AppBskyFeedThreadgate.FollowingRule
      | AppBskyFeedThreadgate.ListRule,
  ) => {
    switch (true) {
      case AppBskyFeedThreadgate.isMentionRule(rule): {
        return (
          <Text className="text-base">Users mentioned in this thread</Text>
        );
      }
      case AppBskyFeedThreadgate.isFollowingRule(rule): {
        return (
          <Text className="text-base">
            Users that{" "}
            <Text className="text-base font-medium">
              {author.displayName ?? `@${author.handle}`}
            </Text>{" "}
            follows
          </Text>
        );
      }
      case AppBskyFeedThreadgate.isListRule(rule): {
        if (!lists || lists.length === 0) {
          return null;
        }
        return (
          <Text className="text-base">
            Users in the list{lists.length > 1 && "s"}{" "}
            {lists.map((list, idx) => (
              <Fragment key={list.uri}>
                <Text
                  key={list.uri}
                  className="text-base font-medium"
                  style={{ color: theme.colors.primary }}
                  onPress={() =>
                    router.push(
                      path(
                        `/profile/${author.did}/lists/${list.uri
                          .split("/")
                          .pop()}`,
                      ),
                    )
                  }
                >
                  {list.name}
                </Text>
                {idx < lists.length - 1 && ", "}
              </Fragment>
            ))}
          </Text>
        );
      }
    }
  };

  if (threadgate.allow.length === 1) {
    return renderRule(threadgate.allow[0]!);
  }

  return (
    <>
      {threadgate.allow.map((rule, idx) => (
        <View key={idx} className="flex-1 flex-row">
          <Text className="text-base font-medium">{"\u2022"}</Text>
          <View className="ml-2">{renderRule(rule)}</View>
        </View>
      ))}
    </>
  );
};
