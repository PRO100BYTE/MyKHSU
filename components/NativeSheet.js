import React, { useEffect, useRef } from 'react';
import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native';

/**
 * Shared sheet contract: visible, onRequestClose, children, theme-aware contentStyle.
 * Native route sheets use the platform page/form sheet presentation. Bounded sheets
 * use a transparent Modal with a bottom-aligned surface on both platforms.
 */
const NativeSheet = ({
  visible,
  onRequestClose,
  children,
  contentStyle,
  accessibilityLabel,
  presentationStyle = 'pageSheet',
  bounded = false,
}) => {
  const closeHandled = useRef(false);

  useEffect(() => {
    if (visible) closeHandled.current = false;
  }, [visible]);

  const handleClose = () => {
    // iOS can call onRequestClose for a swipe and onDismiss afterwards.
    if (closeHandled.current) return;
    closeHandled.current = true;
    onRequestClose?.();
  };

  return (
    <Modal
      visible={visible}
      onRequestClose={handleClose}
      onDismiss={handleClose}
      presentationStyle={Platform.OS === 'ios' && !bounded ? presentationStyle : undefined}
      animationType="slide"
      allowSwipeDismissal={Platform.OS === 'ios' && !bounded}
      transparent={bounded || Platform.OS !== 'ios'}
      accessibilityViewIsModal
      accessibilityLabel={accessibilityLabel}
    >
      <View style={[styles.container, (bounded || Platform.OS === 'android') && styles.androidContainer]}>
        {bounded && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Закрыть"
            style={styles.boundedBackdrop}
            onPress={handleClose}
          />
        )}
        <View style={[styles.content, (bounded || Platform.OS === 'android') && styles.androidContent, bounded && styles.boundedContent, contentStyle]}>
          {children}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  androidContainer: { justifyContent: 'flex-end', backgroundColor: 'rgba(0, 0, 0, 0.45)' },
  content: { flex: 1 },
  androidContent: { maxHeight: '90%', width: '100%' },
  boundedBackdrop: { ...StyleSheet.absoluteFillObject },
  boundedContent: { flex: 0, width: '100%', maxHeight: '100%' },
});

export default NativeSheet;
