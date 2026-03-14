type ActionNoticeProps = {
  kind: "error" | "success";
  message: unknown;
};

export function ActionNotice({ kind, message }: ActionNoticeProps) {
  const text =
    typeof message === "string"
      ? message
      : message instanceof Date
        ? message.toLocaleString()
        : String(message);
  return <p className={`notice ${kind}`}>{text}</p>;
}
