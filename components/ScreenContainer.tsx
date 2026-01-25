import React from 'react';
import { View, StyleSheet, ViewStyle, ScrollView, ScrollViewProps, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme';

interface ScreenContainerProps {
  children: React.ReactNode;
  style?: ViewStyle;
  scrollable?: boolean;
  scrollViewProps?: ScrollViewProps;
  safeAreaEdges?: ('top' | 'bottom' | 'left' | 'right')[];
  backgroundColor?: string;
  /**
   * Enable KeyboardAvoidingView so inputs aren't covered by the keyboard.
   * Recommended for forms.
   */
  keyboardAvoiding?: boolean;
  /**
   * Optional vertical offset for KeyboardAvoidingView (e.g., header height).
   */
  keyboardVerticalOffset?: number;
  /**
   * Add top padding for content (default: true)
   * Set to false if you want content flush with safe area
   */
  contentPadding?: boolean;
  /**
   * Custom top padding value (default: theme.spacing.lg)
   */
  topPadding?: number;
}

export const ScreenContainer: React.FC<ScreenContainerProps> = ({
  children,
  style,
  scrollable = false,
  scrollViewProps,
  safeAreaEdges = ['top', 'bottom'],
  backgroundColor = theme.colors.background,
  keyboardAvoiding = false,
  keyboardVerticalOffset = 0,
  contentPadding = true,
  topPadding = theme.spacing.lg,
}) => {
  const containerStyle = [
    styles.container,
    { backgroundColor },
    style,
  ];

  // Content padding style
  const contentStyle = contentPadding
    ? { paddingTop: topPadding }
    : undefined;

  const content = scrollable ? (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={[
        styles.scrollContent,
        contentStyle,
        scrollViewProps?.contentContainerStyle,
      ]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps={scrollViewProps?.keyboardShouldPersistTaps ?? 'handled'}
      {...scrollViewProps}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.content, contentStyle]}>{children}</View>
  );

  if (keyboardAvoiding) {
    return (
      <SafeAreaView style={containerStyle} edges={safeAreaEdges}>
        <KeyboardAvoidingView
          style={styles.keyboardAvoiding}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={keyboardVerticalOffset}
        >
          {content}
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  if (scrollable) {
    return (
      <SafeAreaView style={containerStyle} edges={safeAreaEdges}>
        {content}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={containerStyle} edges={safeAreaEdges}>
      {content}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  keyboardAvoiding: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
});
