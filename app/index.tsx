import { Redirect } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { supabase } from '@/services/supabase';
import FuturisticLoadingScreen from '@/components/FuturisticLoadingScreen';

export default function Index() {
  const [isAnimationFinished, setIsAnimationFinished] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    let isMounted = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (isMounted) {
        setIsAuthenticated(!!session);
        setSessionChecked(true);
      }
    }).catch(() => {
      if (isMounted) {
        setSessionChecked(true);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  // Show loading animation strictly for the set time (900ms)
  if (!isAnimationFinished) {
    return (
      <FuturisticLoadingScreen
        durationMs={900}
        onFinish={() => setIsAnimationFinished(true)}
      />
    );
  }

  // Once the set time expires:
  // If session check completed and user is logged out -> redirect to /auth
  // Otherwise (authenticated or still loading in background) -> jump to /(tabs) to display skeleton animation!
  if (sessionChecked && !isAuthenticated) {
    return <Redirect href="/auth" />;
  }

  return <Redirect href="/(tabs)" />;
}


