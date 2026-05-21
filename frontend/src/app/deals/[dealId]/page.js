import { redirect } from "next/navigation";

export default async function DealRedirectPage({ params }) {
  const resolvedParams = await params;
  redirect(`/projects/${resolvedParams.dealId}`);
}
