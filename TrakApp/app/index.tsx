import { Redirect } from 'expo-router';
import React from 'react';

export default function Index() {
  // Directly open main dashboard — no authentication wall
  return <Redirect href="/(tabs)" />;
}
