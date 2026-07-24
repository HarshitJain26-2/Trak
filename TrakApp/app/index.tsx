import { Redirect } from 'expo-router';

// Root index — redirect to onboarding on first launch
export default function Index() {
  return <Redirect href="/onboarding" />;
}
