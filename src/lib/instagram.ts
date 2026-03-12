import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { chromium, type BrowserContext } from "@playwright/test";

import { writeAuditEvent } from "./audit";
import { getCollectorSession, loadStorageState, persistStorageState, upsertCollectorSession } from "./collector-session";
import { env } from "./env";
import { ensureAppDirectories, mediaAbsolutePath, mediaRelativePath, playwrightStatePath } from "./paths";
import { ingestPost, postExists } from "./posts";
import { listEnabledSources, markSourceChecked, upsertSource } from "./sources";

type ScrapedMedia = {
  kind: string;
  url: string;
  mimeType: string | null;
  width: number | null;
  height: number | null;
};

type ScrapedPost = {
  permalink: string;
  instagramPostId: string | null;
  caption: string | null;
  postedAt: Date | null;
  postType: string;
  carouselSize: number;
  media: ScrapedMedia[];
};

async function createContext(headed = false) {
  await ensureAppDirectories();
  const session = await getCollectorSession();
  const storageState = session?.session_state_path ?? playwrightStatePath();
  const decryptedState = session ? await loadStorageState().catch(() => undefined) : undefined;

  const browser = await chromium.launch({ headless: !headed });
  const context = await browser.newContext({
    storageState: decryptedState ?? undefined
  });
  return { browser, context, storageState };
}

export async function bootstrapInstagramSession(options?: { headed?: boolean }) {
  const { browser, context, storageState } = await createContext(options?.headed ?? false);
  const page = await context.newPage();
  await page.goto("https://www.instagram.com/accounts/login/", { waitUntil: "domcontentloaded" });

  if (env.INSTAGRAM_USERNAME && env.INSTAGRAM_PASSWORD) {
    await page.getByLabel("Phone number, username, or email").fill(env.INSTAGRAM_USERNAME);
    await page.getByLabel("Password").fill(env.INSTAGRAM_PASSWORD);
    await page.getByRole("button", { name: /log in/i }).click();
    await page.waitForTimeout(5000);
  } else if (options?.headed) {
    await page.waitForTimeout(60000);
  } else {
    throw new Error("Interactive login requires headed mode or INSTAGRAM_USERNAME / INSTAGRAM_PASSWORD");
  }

  const state = await context.storageState();
  await persistStorageState(JSON.stringify(state));
  await upsertCollectorSession({
    sessionStatePath: storageState,
    lastLoginAt: new Date(),
    challengeState: null,
    lastError: null
  });
  await browser.close();
  await writeAuditEvent("collector.session.bootstrap", "Instagram session stored", { storageState });
  return storageState;
}

async function downloadMedia(url: string, username: string, postId: string, index: number) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download media: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const extension = response.headers.get("content-type")?.includes("png") ? "png" : "jpg";
  const relativeDir = mediaRelativePath(username, postId);
  const fileName = `${index}.${extension}`;
  const relativePath = path.join(relativeDir, fileName);
  const absoluteDir = mediaAbsolutePath(relativeDir);

  await mkdir(absoluteDir, { recursive: true });
  await writeFile(mediaAbsolutePath(relativePath), buffer);

  return {
    localPath: relativePath,
    mimeType: response.headers.get("content-type"),
    fileSize: buffer.byteLength,
    sha256: createHash("sha256").update(buffer).digest("hex")
  };
}

async function scrapeProfile(context: BrowserContext, username: string): Promise<ScrapedPost[]> {
  const page = await context.newPage();
  await page.goto(`https://www.instagram.com/${username}/`, { waitUntil: "networkidle" });

  if (page.url().includes("challenge")) {
    await upsertCollectorSession({ challengeState: "challenge_required", lastError: "Instagram challenge required" });
    throw new Error("Instagram challenge required");
  }

  const postLinks = await page.$$eval("a[href*='/p/']", (anchors) =>
    Array.from(new Set(anchors.map((anchor) => (anchor as HTMLAnchorElement).href))).slice(0, 12)
  );

  const scraped: ScrapedPost[] = [];
  for (const link of postLinks) {
    const detail = await context.newPage();
    await detail.goto(link, { waitUntil: "networkidle" });

    const typeName = await detail
      .$eval('meta[property="og:type"]', (node) => node.getAttribute("content"))
      .catch(() => null);
    const imageUrl = await detail
      .$eval('meta[property="og:image"]', (node) => node.getAttribute("content"))
      .catch(() => null);
    const description = await detail
      .$eval('meta[property="og:description"]', (node) => node.getAttribute("content"))
      .catch(() => null);

    const carouselImages = await detail.$$eval("article img", (nodes) =>
      Array.from(new Set(nodes.map((node) => (node as HTMLImageElement).src).filter(Boolean)))
    );

    if (!imageUrl) {
      await detail.close();
      continue;
    }

    const timestamp = await detail
      .$eval("time", (node) => node.getAttribute("datetime"))
      .catch(() => null);

    scraped.push({
      permalink: link,
      instagramPostId: link.split("/").filter(Boolean).at(-1) ?? null,
      caption: description,
      postedAt: timestamp ? new Date(timestamp) : null,
      postType: typeName === "video.other" ? "video" : "image",
      carouselSize: carouselImages.length || 1,
      media: (carouselImages.length ? carouselImages : [imageUrl]).map((url) => ({
        kind: "image",
        url,
        mimeType: "image/jpeg",
        width: null,
        height: null
      }))
    });
    await detail.close();
  }

  await page.close();
  return scraped;
}

export async function discoverFollowedAccounts() {
  const { browser, context } = await createContext(false);
  const page = await context.newPage();
  await page.goto("https://www.instagram.com/", { waitUntil: "networkidle" });

  const profileHref = await page
    .$eval("nav a[href^='/']", (anchor) => (anchor as HTMLAnchorElement).href)
    .catch(() => null);

  if (!profileHref) {
    await browser.close();
    return [];
  }

  const ownProfile = new URL(profileHref).pathname.split("/").filter(Boolean)[0];
  await page.goto(`https://www.instagram.com/${ownProfile}/following/`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);

  const handles = await page.$$eval("a[href^='/']", (anchors) =>
    Array.from(
      new Set(
        anchors
          .map((anchor) => (anchor as HTMLAnchorElement).getAttribute("href") ?? "")
          .map((href) => href.split("/").filter(Boolean)[0])
          .filter((value) => value && !["explore", "reels", "accounts"].includes(value))
      )
    ).slice(0, 200)
  );

  const discovered = [];
  for (const handle of handles) {
    discovered.push(await upsertSource(handle, { autoDiscovered: true }));
  }

  await browser.close();
  await writeAuditEvent("collector.discovery", "Discovered followed accounts", { count: discovered.length });
  return discovered;
}

export async function collectLatestPosts() {
  const sources = await listEnabledSources();
  const { browser, context } = await createContext(false);
  const results: Array<{ username: string; ingested: number }> = [];

  for (const source of sources) {
    try {
      await markSourceChecked(source.id, "checking");
      const posts = await scrapeProfile(context, source.instagram_username);
      let ingested = 0;

      for (const post of posts) {
        if (post.postType !== "image") {
          await writeAuditEvent("collector.unsupported", "Skipped unsupported post type", {
            username: source.instagram_username,
            permalink: post.permalink,
            postType: post.postType
          });
          continue;
        }

        const media = [];
        for (const [index, item] of post.media.entries()) {
          const downloaded = await downloadMedia(
            item.url,
            source.instagram_username,
            post.instagramPostId ?? `post-${index}`,
            index
          );
          media.push({
            kind: item.kind,
            localPath: downloaded.localPath,
            mimeType: downloaded.mimeType,
            width: item.width,
            height: item.height,
            fileSize: downloaded.fileSize,
            sha256: downloaded.sha256
          });
        }

        const checksum = media.map((item) => item.sha256).join(":");
        if (await postExists(post.permalink, checksum)) {
          continue;
        }
        await ingestPost({
          sourceId: source.id,
          instagramPostId: post.instagramPostId,
          caption: post.caption,
          postedAt: post.postedAt,
          postType: post.postType,
          carouselSize: post.carouselSize,
          permalink: post.permalink,
          checksum,
          media
        });
        ingested += 1;
      }

      await markSourceChecked(source.id, "ok", true);
      results.push({ username: source.instagram_username, ingested });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown collector error";
      await markSourceChecked(source.id, "error");
      await upsertCollectorSession({ lastError: message, challengeState: message.includes("challenge") ? "challenge_required" : null });
      await writeAuditEvent("collector.error", "Collection failed", {
        username: source.instagram_username,
        error: message
      }, "error");
    }
  }

  await browser.close();
  await writeAuditEvent("collector.complete", "Collection finished", { results });
  return results;
}
