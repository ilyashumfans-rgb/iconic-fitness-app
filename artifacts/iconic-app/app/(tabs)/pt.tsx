import { Redirect } from "expo-router";

/**
 * Placeholder route for the "Trainers" footer tab. The tab button itself
 * intercepts the press (tabPress preventDefault in the tabs layout) and pushes
 * the Personal Trainers screen; if this route is ever reached directly, it
 * redirects there too.
 */
export default function TrainersTab() {
  return <Redirect href="/trainers" />;
}
