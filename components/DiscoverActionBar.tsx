import React from 'react';
import { View, StyleSheet } from 'react-native';
import { PrimaryButton } from './PrimaryButton';
import { SecondaryButton } from './SecondaryButton';
import { theme } from '../theme';

/** Min touch target (dp) for like/pass buttons. */
const MIN_TOUCH_TARGET = 48;
/** Horizontal gap between buttons to reduce mis-taps. */
const BUTTON_GAP = theme.spacing.lg;

interface DiscoverActionBarProps {
  onPass: () => void;
  onLike: () => void;
  disabled?: boolean;
}

export const DiscoverActionBar: React.FC<DiscoverActionBarProps> = ({
  onPass,
  onLike,
  disabled = false,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <SecondaryButton
          title="Pass"
          onPress={onPass}
          disabled={disabled}
          style={styles.button}
        />
        <PrimaryButton
          title="Like"
          onPress={onLike}
          disabled={disabled}
          style={styles.button}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: theme.spacing.base,
    paddingBottom: theme.spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: BUTTON_GAP,
  },
  button: {
    flex: 1,
    minHeight: MIN_TOUCH_TARGET,
  },
});

