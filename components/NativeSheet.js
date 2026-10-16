import React, { useEffect, useRef } from 'react';
import { Modal, Platform, StyleSheet, View } from 'react-native';

/**
 * Shared sheet contract: visible, onRequestClose, children, theme-aware contentStyle.
 * iOS uses the platform page/form sheet presentation; Android uses a transparent
 * Modal with a bottom-aligned surface because it has no equivalent presentation style.
 */
const NativeSheet = ({
  visible,
  onRequestClose,
  children,
  contentStyle,
  accessibilityLabel,
  presentationStyle = 'pageSheet',
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
      presentationStyle={Platform.OS === 'ios' ? presentationStyle : undefined}
      animationType="slide"
      allowSwipeDismissal={Platform.OS === 'ios'}
      transparent={Platform.OS !== 'ios'}
      accessibilityViewIsModal
      accessibilityLabel={accessibilityLabel}
    >
      <View style={[styles.container, Platform.OS === 'android' && styles.androidContainer]}>
        <View style={[styles.content, Platform.OS === 'android' && styles.androidContent, contentStyle]}>
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
});

export default NativeSheet;
