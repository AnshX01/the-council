/**
 * Bug B1 Fix: Legacy session route redirect
 * Redirects /session/:id to canonical /c/:id chamber route.
 */

import { redirect } from 'next/navigation';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function LegacySessionRedirect({ params }: Props) {
  const { id } = await params;
  redirect(`/c/${id}`);
}
