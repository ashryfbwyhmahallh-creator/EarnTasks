import type { ReactNode } from "react";

// Top-level Creator portal shell.
// This is a completely standalone island: it does NOT render the standard user
// NavBar, sidebar, or any user-app chrome. Each child route supplies its own
// header (the authenticated (dashboard) group adds the creator nav; the public
// login/register routes render bare auth screens).
export const metadata = {
  title: "Creator Hub",
  description: "EarnTasks affiliate & creator portal",
};

export default function CreatorPortalLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-[#0a0a12] text-white">{children}</div>;
}
