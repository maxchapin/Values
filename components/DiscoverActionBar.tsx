import React from 'react';
import { View, StyleSheet } from 'react-native';
import { PrimaryButton } from './PrimaryButton';
import { SecondaryButton } from './SecondaryButton';
import { theme } from '../theme';

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
    gap: theme.spacing.md,
  },
  button: {
    flex: 1,
  },
});

