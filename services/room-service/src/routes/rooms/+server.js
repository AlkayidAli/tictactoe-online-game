import { json } from '@sveltejs/kit';
import crypto from 'crypto';

// This +server.js is for future expansion; currently Express endpoint handles /rooms POST.
// We keep this minimal so the SvelteKit build has at least one route.

export const POST = async ({ request }) => {
  const body = await request.json().catch(() => ({}));
  let { roomId } = body;
  if (!roomId) roomId = crypto.randomUUID().slice(0, 8);
  return json({ roomId });
};
