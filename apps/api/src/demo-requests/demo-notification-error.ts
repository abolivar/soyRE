export function toSafeDemoNotificationError(error: unknown) {
  return (error instanceof Error ? error.message : 'Unknown notification error')
    .replace(/\s+/g, ' ')
    .slice(0, 500);
}
