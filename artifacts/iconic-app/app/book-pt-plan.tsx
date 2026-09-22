import BookPtSessionsScreen from "./book-pt-sessions";

// Keep the post-Kick-Start eligibility check and wallet redemption while using
// the same branch-authoritative trainer selection and hosted checkout journey.
export default function BookPtPlanScreen() {
  return <BookPtSessionsScreen afterTrial />;
}