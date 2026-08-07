import { Redirect } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { supabase } from '@/services/supabase';
import FuturisticLoadingScreen from '@/components/FuturisticLoadingScreen';

export default function Index() {
  const [isAnimationFinished, setIsAnimationFinished] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
      setSessionChecked(true);
    });
  }, []);

  // Wait for both session check and loading animation completion
  if (!sessionChecked || !isAnimationFinished) {
    return (
      <FuturisticLoadingScreen
        durationMs={2800}
        onFinish={() => setIsAnimationFinished(true)}
      />
    );
  }

  return <Redirect href={isAuthenticated ? '/(tabs)' : '/auth'} />;
}

