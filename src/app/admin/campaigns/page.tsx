import { redirect } from "next/navigation";

export default function CampaignsRedirectPage() {
  redirect("/admin/utm-settings?tab=campaigns");
}
