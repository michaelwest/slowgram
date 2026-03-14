export function extractErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  return "Unexpected error";
}

export function encodeActionMessage(message: string) {
  return encodeURIComponent(message.slice(0, 160));
}
