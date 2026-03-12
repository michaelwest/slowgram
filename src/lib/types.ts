export type Source = {
  id: string;
  instagram_username: string;
  instagram_profile_url: string;
  status: string;
  last_checked_at: Date | null;
  last_success_at: Date | null;
  notes: string | null;
  is_auto_discovered: boolean;
  is_enabled: boolean;
  is_excluded: boolean;
  created_at: Date;
  updated_at: Date;
};

export type PostRecord = {
  id: string;
  source_id: string;
  instagram_post_id: string | null;
  caption: string | null;
  posted_at: Date | null;
  discovered_at: Date;
  post_type: string;
  carousel_size: number;
  permalink: string;
  checksum: string | null;
};

export type MediaAsset = {
  id: string;
  post_id: string;
  kind: string;
  local_path: string;
  mime_type: string | null;
  width: number | null;
  height: number | null;
  file_size: number | null;
  sha256: string | null;
};

export type DigestSummary = {
  id: string;
  digest_date: string;
  status: string;
  generated_at: Date | null;
  sent_at: Date | null;
  post_count: number;
  cover_path: string | null;
};

export type DigestDetail = DigestSummary & {
  items: Array<{
    position: number;
    post: PostRecord & {
      source_username: string;
      media_assets: MediaAsset[];
    };
  }>;
};

export type CollectorSession = {
  id: string;
  session_state_path: string;
  last_login_at: Date | null;
  challenge_state: string | null;
  last_error: string | null;
  created_at: Date;
  updated_at: Date;
};
