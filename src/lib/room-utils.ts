/**
 * Utility for generating secure, randomized room names for StudyForge.
 */
export function generateRandomRoomName() {
  const randomString = Math.random().toString(36).substring(2, 8);
  return `StudyForge_${randomString}`;
}
