import { ComAtprotoSyncSubscribeRepos } from "@atproto/api";

import { FirehoseSubscriptionBase, getOpsByType } from "./utils/subscription";

type RepoEvent =
  | ComAtprotoSyncSubscribeRepos.Commit
  | ComAtprotoSyncSubscribeRepos.Handle
  | ComAtprotoSyncSubscribeRepos.Migrate
  | ComAtprotoSyncSubscribeRepos.Tombstone
  | ComAtprotoSyncSubscribeRepos.Info;

export class FirehoseSubscription extends FirehoseSubscriptionBase {
  async handleEvent(evt: RepoEvent) {
    if (!ComAtprotoSyncSubscribeRepos.isCommit(evt)) return;
    const ops = await getOpsByType(evt);

    // This logs the text of every post off the firehose.
    // Just for fun :)
    // Delete before actually using
    for (const post of ops.posts.creates) {
      console.log(post.record.text);
    }

    const postsToDelete = ops.posts.deletes.map((del) => del.uri);
    const postsToCreate = ops.posts.creates.map((create) => {
      // map alf-related posts to a db row
      return {
        uri: create.uri,
        cid: create.cid,
        replyParent: create.record?.reply?.parent.uri ?? null,
        replyRoot: create.record?.reply?.root.uri ?? null,
        indexedAt: new Date().toISOString(),
      };
    });

    if (postsToDelete.length > 0) {
      await this.db
        .deleteFrom("post")
        .where("uri", "in", postsToDelete)
        .execute();
    }
    if (postsToCreate.length > 0) {
      await this.db
        .insertInto("post")
        .values(postsToCreate)
        .onConflict((oc) => oc.doNothing())
        .execute();
    }
  }
}
