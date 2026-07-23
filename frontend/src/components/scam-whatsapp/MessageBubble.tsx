import { View, Text } from 'react-native';
import { WhatsAppMessage } from '@/features/scam-whatsapp/models';
import { whatsAppStyles } from '@/styles/scam-whatsapp';

interface MessageBubbleProps {
  message: WhatsAppMessage;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const isOutbound = message.direction === 'outbound';

  return (
    <View
      style={[
        whatsAppStyles.bubbleRow,
        isOutbound ? whatsAppStyles.bubbleRowOutbound : whatsAppStyles.bubbleRowInbound,
      ]}
    >
      <View style={[whatsAppStyles.bubble, isOutbound ? whatsAppStyles.bubbleOutbound : whatsAppStyles.bubbleInbound]}>
        <Text style={whatsAppStyles.bubbleText}>{message.body}</Text>
      </View>
    </View>
  );
}
