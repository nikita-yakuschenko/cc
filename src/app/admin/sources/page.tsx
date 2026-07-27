import { redirect } from "next/navigation";

export default function SourcesRedirectPage() {
  redirect("/admin/utm-settings?tab=sources");
}
