import { View, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { callStyles } from '../../styles/scam-call';

interface CallButtonsProps {
  onAction: (action: 'Answer' | 'Decline') => void;
  disabled?: boolean;
}

export default function CallButtons({ onAction, disabled = false }: CallButtonsProps) {
  return (
    <View style={callStyles.buttonContainer}>
      <TouchableOpacity 
        style={[callStyles.iconButton, callStyles.answerButton]} 
        onPress={() => onAction('Answer')}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel="Answer call"
        accessibilityHint="Accept the incoming call and speak with the caller"
      >
        <MaterialIcons name="call" size={38} color="white" />
      </TouchableOpacity>

      <TouchableOpacity 
        style={[callStyles.iconButton, callStyles.declineButton]} 
        onPress={() => onAction('Decline')}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel="Decline call"
        accessibilityHint="Reject the incoming call"
      >
        <MaterialIcons name="call-end" size={38} color="white" />
      </TouchableOpacity>
    </View>
  );
}
