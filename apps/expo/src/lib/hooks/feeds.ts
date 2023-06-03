import { useEffect, useMemo, useState } from "react";
import {
  AppBskyActorDefs,
  AppBskyFeedDefs,
  type AppBskyFeedGetFeedGenerator,
} from "@atproto/api";
import { useInfiniteQuery, useMutation, useQuery } from "@tanstack/react-query";
import { produce } from "immer";

import { useAuthedAgent } from "../agent";
import { queryClient } from "../query-client";

export const useSavedFeeds = (
  { pinned }: { pinned: boolean } = { pinned: false },
) => {
  const agent = useAuthedAgent();

  return useQuery({
    queryKey: ["feeds", "saved", { pinned }],
    queryFn: async () => {
      const prefs = await agent.app.bsky.actor.getPreferences();
      if (!prefs.success) throw new Error("Could not fetch feeds");
      const feeds = prefs.data.preferences.find(
        (pref) =>
          AppBskyActorDefs.isSavedFeedsPref(pref) &&
          AppBskyActorDefs.validateSavedFeedsPref(pref).success,
      ) as AppBskyActorDefs.SavedFeedsPref | undefined;
      if (!feeds)
        return {
          feeds: [],
          pinned: [],
          saved: [],
          preferences: prefs.data.preferences,
        };
      const generators = await agent.app.bsky.feed.getFeedGenerators({
        feeds: pinned ? feeds.pinned : feeds.saved,
      });
      if (!generators.success) {
        throw new Error("Could not fetch feed generators");
      }
      return {
        feeds: generators.data.feeds.map((feed) => ({
          ...feed,
          pinned: feeds.pinned.includes(feed.uri),
        })),
        pinned: feeds.pinned,
        saved: feeds.saved,
        preferences: prefs.data.preferences,
      };
    },
  });
};

export const useFeedInfo = (feed: string) => {
  const agent = useAuthedAgent();

  return useQuery({
    queryKey: ["generator", feed],
    queryFn: async () => {
      if (feed === "following") {
        return {
          view: {
            displayName: "Following",
            uri: "",
            cid: "",
            creator: {
              ...agent.session,
            },
            indexedAt: "",
          },
          isOnline: true,
          isValid: true,
        } satisfies AppBskyFeedGetFeedGenerator.OutputSchema;
      }
      const gen = await agent.app.bsky.feed.getFeedGenerator({
        feed,
      });
      if (!gen.success) throw new Error("Failed to get generator");
      return gen.data;
    },
  });
};

export const useToggleFeedPref = (
  preferences?: AppBskyActorDefs.Preferences,
) => {
  const agent = useAuthedAgent();

  return useMutation({
    mutationFn: async ({ save, pin }: { save?: string; pin?: string }) => {
      if (!preferences) return;
      if (!save && !pin) throw new Error("Must provide save or pin");
      if (save && pin) throw new Error("Cannot provide both save and pin");

      await agent.app.bsky.actor.putPreferences({
        preferences: produce(preferences, (draft) => {
          for (const pref of draft) {
            if (
              AppBskyActorDefs.isSavedFeedsPref(pref) &&
              AppBskyActorDefs.validateSavedFeedsPref(pref).success
            ) {
              if (save) {
                if (pref.saved.includes(save)) {
                  pref.pinned = pref.pinned.filter((f) => f !== save);
                  pref.saved = pref.saved.filter((f) => f !== save);
                } else {
                  pref.saved.push(save);
                }
              } else if (pin) {
                if (pref.pinned.includes(pin)) {
                  pref.pinned = pref.pinned.filter((f) => f !== pin);
                } else {
                  pref.pinned.push(pin);
                }
              }
            }
          }
        }),
      });
    },
    onSettled: () => queryClient.invalidateQueries(["feeds", "saved"]),
  });
};

export const useReorderFeeds = (
  savedFeeds: ReturnType<typeof useSavedFeeds>,
) => {
  const agent = useAuthedAgent();
  const [pinned, setPinned] = useState(savedFeeds.data?.pinned ?? []);

  const stringified = (savedFeeds.data?.pinned ?? []).sort().toString();

  useEffect(() => {
    if (savedFeeds.data?.pinned) setPinned(savedFeeds.data.pinned);
  }, [savedFeeds.data?.pinned, stringified]);

  const reorder = useMutation({
    mutationFn: async (pins: string[]) => {
      if (!savedFeeds.data) return;
      setPinned(pins);
      await agent.app.bsky.actor.putPreferences({
        preferences: produce(savedFeeds.data.preferences, (draft) => {
          for (const pref of draft) {
            if (
              AppBskyActorDefs.isSavedFeedsPref(pref) &&
              AppBskyActorDefs.validateSavedFeedsPref(pref).success
            ) {
              pref.pinned = pins;
            }
          }
        }),
      });
    },
    onSettled: () => queryClient.invalidateQueries(["feeds", "saved"]),
  });

  return { pinned, reorder };
};

export const useTimeline = (algorithm: string) => {
  const agent = useAuthedAgent();

  const timeline = useInfiniteQuery({
    queryKey: ["timeline", algorithm],
    queryFn: async ({ pageParam }) => {
      if (algorithm === "following") {
        const following = await agent.getTimeline({
          cursor: pageParam as string | undefined,
        });
        if (!following.success) throw new Error("Failed to fetch feed");
        return following.data;
      } else {
        // const generator = await agent.app.bsky.feed.getFeedGenerator({
        //   feed: algorithm,
        // });
        // if (!generator.success)
        //   throw new Error("Failed to fetch feed generator");
        // console.log(generator.data);
        // if (!generator.data.isOnline || !generator.data.isValid) {
        //   throw new Error(
        //     "This custom feed is not online or may be experiencing issues",
        //   );
        // }
        const feed = await agent.app.bsky.feed.getFeed({
          feed: algorithm,
          cursor: pageParam as string | undefined,
        });
        if (!feed.success) throw new Error("Failed to fetch feed");
        return feed.data;
      }
    },
    getNextPageParam: (lastPage) => lastPage.cursor,
  });

  const data = useMemo(() => {
    if (!timeline.data) return [];
    const flattened = timeline.data.pages.flatMap((page) => page.feed);
    return flattened
      .map((item) =>
        // if the preview item is replying to this one, skip
        // arr[i - 1]?.reply?.parent?.cid === item.cid
        //   ? [] :
        {
          if (item.reply && !item.reason) {
            if (AppBskyFeedDefs.isBlockedPost(item.reply.parent)) {
              return [];
            } else if (
              AppBskyFeedDefs.isPostView(item.reply.parent) &&
              AppBskyFeedDefs.validatePostView(item.reply.parent).success
            ) {
              return [
                { item: { post: item.reply.parent }, hasReply: true },
                { item, hasReply: false },
              ];
            } else {
              return [{ item, hasReply: false }];
            }
          } else {
            return [{ item, hasReply: false }];
          }
        },
      )
      .flat();
  }, [timeline]);

  return { timeline, data };
};
