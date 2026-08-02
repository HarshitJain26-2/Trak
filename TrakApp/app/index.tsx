import { Redirect } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';
import { Colors } from '../constants/colors';

export default function Index() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
      setIsLoading(false);
    });
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.surfaceContainerLowest, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={Colors.primaryFixed} size="large" />
      </View>
    );
  }

  return <Redirect href={isAuthenticated ? '/(tabs)' : '/auth'} />;
}
