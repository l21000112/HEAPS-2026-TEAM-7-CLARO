import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { whatsAppStyles } from '@/styles/scam-whatsapp';
import { Ionicons } from '@expo/vector-icons';

interface MessageComposerProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  disabled?: boolean;
}

export default function MessageComposer({
  value,
  onChangeText,
  onSend,
  disabled = false,
}: MessageComposerProps) {
  const { t } = useTranslation();
  const canSend = !disabled && value.trim().length > 0;
  return (
    <View>
      <View style={whatsAppStyles.composerRow} className='bg-input'>
        <TextInput
          className='border border-primary text-foreground'
          style={whatsAppStyles.composerInput}
          placeholder={t('whatsapp.typePlaceholder')}
          placeholderTextColor="#8696a0"
          value={value}
          onChangeText={onChangeText} 
          editable={!disabled}
          multiline
        />
        <TouchableOpacity
          className='rounded-full bg-green-500 p-3'
          style={!canSend ? { opacity: 0.4 } : null}
          onPress={() => {
            if (canSend) {
              onSend();
            }
          }}
          activeOpacity={0.7}
          disabled={!canSend}
          accessibilityRole="button"
          accessibilityLabel="Send message"
          accessibilityHint="Send your typed message"
          accessibilityState={{ disabled: !canSend }}
        >
          <Ionicons name="send" size={20} style={{ alignSelf: 'center' }}/>
        </TouchableOpacity>
      </View>
    </View>
  );
}