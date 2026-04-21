export function getErrorMessage(err: unknown, fallback: string): string {
  const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
  return msg || fallback;
}
