import React from 'react';
import { View, StyleSheet, ViewStyle, ScrollView, ScrollViewProps, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../theme';

interface ScreenContainerProps {
  children: React.ReactNode;
  style?: ViewStyle;
  scrollable?: boolean;
  scrollViewProps?: ScrollViewProps;
  safeAreaEdges?: ('top' | 'bottom' | 'left' | 'right')[];
  backgroundColor?: string;
  /**
   * When set, status bar / notch area uses this color and content starts below it.
   * Use theme.colors.headerBackground for app-wide seamless header.
   */
  headerBackgroundColor?: string;
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
  headerBackgroundColor,
  keyboardAvoiding = false,
  keyboardVerticalOffset = 0,
  contentPadding = true,
  topPadding = theme.spacing.lg,
}) => {
  const insets = useSafeAreaInsets();
  const containerStyle = [
    styles.container,
    { backgroundColor: headerBackgroundColor ?? backgroundColor },
    style,
  ];

  // When using header background, we draw it into the notch; SafeAreaView only gets bottom edge
  const effectiveEdges = headerBackgroundColor ? (safeAreaEdges.filter((e) => e !== 'top') as ('bottom' | 'left' | 'right')[]) : safeAreaEdges;

  // Content padding style (no extra top inset when headerBackgroundColor - SafeAreaView handles it)
  const contentStyle = contentPadding
    ? { paddingTop: topPadding }
    : undefined;

  const content = scrollable ? (
    <ScrollView
      style={[styles.scrollView, !headerBackgroundColor && { backgroundColor }]}
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
    <View style={[styles.content, contentStyle, !headerBackgroundColor && { backgroundColor }]}>{children}</View>
  );

  if (headerBackgroundColor) {
    // Status bar + header row use same color; SafeAreaView is transparent so screen's header shows through
    return (
      <View style={[styles.container, { backgroundColor: headerBackgroundColor }]}>
        <SafeAreaView style={styles.container} edges={['bottom']}>
          {keyboardAvoiding ? (
            <KeyboardAvoidingView
              style={styles.keyboardAvoiding}
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              keyboardVerticalOffset={keyboardVerticalOffset}
            >
              {content}
            </KeyboardAvoidingView>
          ) : (
            content
          )}
        </SafeAreaView>
      </View>
    );
  }

  if (keyboardAvoiding) {
    return (
      <SafeAreaView style={containerStyle} edges={effectiveEdges}>
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
      <SafeAreaView style={containerStyle} edges={effectiveEdges}>
        {content}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={containerStyle} edges={effectiveEdges}>
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
