import React from 'react';
import { Modal, TouchableOpacity, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  visible: boolean;
  selectedTypes: Set<string>;
  onToggleType: (type: string) => void;
  onClose: () => void;
  onConfirm: () => void;
  styles: any;
  c: any;
};

export function QuizTypeModal({
  visible,
  selectedTypes,
  onToggleType,
  onClose,
  onConfirm,
  styles,
  c,
}: Props) {
  const types = [
    { id: 'MULTIPLE_CHOICE', label: 'Çoktan Seçmeli' },
    { id: 'FILL_IN_THE_BLANKS', label: 'Boşluk Doldurma' },
    { id: 'LISTENING', label: 'Dinleme' },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.mkOverlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={styles.mkSheet} activeOpacity={1}>
          <Text style={styles.mkTitle}>Pratik Türlerini Seçin</Text>
          <Text style={[styles.mkWarningText, { marginBottom: 10 }]}>En az bir pratik türü seçmelisiniz.</Text>

          <View style={{ gap: 12, marginBottom: 10 }}>
            {types.map((t) => {
              const checked = selectedTypes.has(t.id);
              return (
                <TouchableOpacity
                  key={t.id}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 12,
                    padding: 16, borderRadius: 12, borderWidth: 1,
                    borderColor: checked ? c.PURPLE : c.BORDER,
                    backgroundColor: checked ? c.PURPLE + '15' : c.SURFACE2,
                  }}
                  onPress={() => onToggleType(t.id)}
                  activeOpacity={0.7}
                >
                  <Ionicons name={checked ? "checkbox" : "square-outline"} size={22} color={checked ? c.PURPLE : c.TEXT_S} />
                  <Text style={{ flex: 1, color: c.TEXT_P, fontSize: 16, fontWeight: '600' }}>{t.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.mkBtnRow}>
            <TouchableOpacity style={styles.mkCancelBtn} onPress={onClose} activeOpacity={0.8}>
              <Text style={styles.mkCancelText}>İptal</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.mkConfirmBtn, selectedTypes.size === 0 && { opacity: 0.5 }]}
              onPress={onConfirm}
              disabled={selectedTypes.size === 0}
              activeOpacity={0.85}
            >
              <Text style={styles.mkConfirmText}>Başla</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}
