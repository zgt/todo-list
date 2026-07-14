import { redirect } from "next/navigation";

import { getSession } from "~/auth/server";
import { AppBackground } from "~/components/app-background";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session?.user) redirect("/");

  return (
    <>
      <AppBackground />
      {children}
    </>
  );
}
