import { Redirect } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';
import { Colors } from '../constants/colors';

export default function Index() {
  const [initialRoute, setInitialRoute] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (isMounted) {
          setInitialRoute(session ? '/(tabs)' : '/onboarding');
        }
      } catch {
        if (isMounted) {
          setInitialRoute('/onboarding');
        }
      }
    };
    checkSession();
    return () => {
      isMounted = false;
    };
  }, []);

  if (!initialRoute) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.surfaceContainerLowest, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={Colors.primaryFixed} size="large" />
      </View>
    );
  }

  return <Redirect href={initialRoute as any} />;
}
