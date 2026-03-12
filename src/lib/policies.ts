export function shouldIncludeDigest(args: {
  digestDate: string;
  queryDate?: string;
  unseenOnly?: boolean;
  generatedAt?: Date | null;
  lastVisitAt?: Date | null;
}) {
  if (args.queryDate && args.queryDate !== args.digestDate) {
    return false;
  }

  if (args.unseenOnly && args.lastVisitAt && args.generatedAt) {
    return args.generatedAt > args.lastVisitAt;
  }

  return true;
}

export function filterDigestItemsBySource<T extends { post: { source_username: string } }>(
  items: T[],
  source?: string
) {
  if (!source) {
    return items;
  }

  const normalized = source.toLowerCase();
  return items.filter((item) => item.post.source_username.toLowerCase() === normalized);
}

export function isAllowedOperatorEmail(input: string | null | undefined, allowedEmail: string) {
  return input === allowedEmail;
}
