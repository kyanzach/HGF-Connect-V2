import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';

export type AlertType = 'success' | 'error' | 'warning' | 'info';

interface AlertPromptModalProps {
  visible: boolean;
  type?: AlertType;
  title: string;
  message: string;
  buttonText?: string;
  onClose: () => void;
}

const META: Record<AlertType, { icon: React.ComponentProps<typeof FontAwesome>['name']; color: string; bg: string }> = {
  success: { icon: 'check-circle', color: '#10b981', bg: '#ecfdf5' },
  error:   { icon: 'exclamation-circle', color: '#ef4444', bg: '#fef2f2' },
  warning: { icon: 'exclamation-triangle', color: '#f59e0b', bg: '#fffbeb' },
  info:    { icon: 'info-circle', color: '#4EB1CB', bg: '#e0f7fb' },
};

export default function AlertPromptModal({
  visible,
  type = 'info',
  title,
  message,
  buttonText = 'OK',
  onClose,
}: AlertPromptModalProps) {
  const m = META[type] || META.info;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={[styles.iconCircle, { backgroundColor: m.bg }]}>
            <FontAwesome name={m.icon} size={28} color={m.color} />
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <TouchableOpacity style={[styles.button, { backgroundColor: '#4EB1CB' }]} onPress={onClose} activeOpacity={0.85}>
            <Text numberOfLines={1} adjustsFontSizeToFit style={styles.buttonText}>
              {buttonText}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  button: {
    width: '100%',
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
