import { getSettings } from "@/actions/settings";
import { SettingsClientPage } from "./settings-client-page";

export default async function SettingsPage() {
  const { data: settings } = await getSettings();

  return <SettingsClientPage initialSettings={settings} />;
}
