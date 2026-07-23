import { View, Text, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { WhatsAppContact } from '@/features/scam-whatsapp/models';
import { whatsAppStyles } from '@/styles/scam-whatsapp';

interface ThreadHeaderProps {
  contact: WhatsAppContact;
  onBlock: () => void;
  onReport: () => void;
  actionsDisabled?: boolean;
}

export default function ThreadHeader({
  contact,
  onBlock,
  onReport,
  actionsDisabled = false,
}: ThreadHeaderProps) {
  const { t } = useTranslation();
  return (
    <View style={whatsAppStyles.threadHeader} className='bg-input border border-primary'>
      <View>
        <Text style={whatsAppStyles.contactName} className='text-primary'>{contact.displayName}</Text>
        {contact.phoneNumber ? (
          <Text style={whatsAppStyles.contactNumber} className='text-foreground'>{contact.phoneNumber}</Text>
        ) : null}
      </View>
      <View style={whatsAppStyles.headerActions}>
        <TouchableOpacity
          style={whatsAppStyles.headerActionButton}
          className='bg-red-500/70'
          onPress={onBlock}
          disabled={actionsDisabled}
          accessibilityRole="button"
          accessibilityLabel="Block contact"
          accessibilityHint="Block this contact and end the conversation"
          accessibilityState={{ disabled: actionsDisabled }}
        >
          <Text style={whatsAppStyles.headerActionText} className='text-primary'>{t('whatsapp.block')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={whatsAppStyles.headerActionButton}
          className='bg-red-500/70'
          onPress={onReport}
          disabled={actionsDisabled}
          accessibilityRole="button"
          accessibilityLabel="Report contact"
          accessibilityHint="Report this contact and end the conversation"
          accessibilityState={{ disabled: actionsDisabled }}
        >
          <Text style={whatsAppStyles.headerActionText} className='text-primary'>{t('whatsapp.report')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
