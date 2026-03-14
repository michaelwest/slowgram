type ActionNoticeProps = {
  kind: "error" | "success";
  message: string;
};

export function ActionNotice({ kind, message }: ActionNoticeProps) {
  return <p className={`notice ${kind}`}>{message}</p>;
}
