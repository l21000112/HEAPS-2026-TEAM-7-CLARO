import { Text, TouchableOpacity } from 'react-native';
import { callStyles } from '../../styles/scam-call';
import { DialogueOption as DialogueOptionModel } from '../../features/scam-call/models';

interface DialogueOptionProps {
  option: DialogueOptionModel;
  onPress: (option: DialogueOptionModel) => void;
  disabled?: boolean;
}

export default function DialogueOption({ option, onPress, disabled = false }: DialogueOptionProps) {
  return (
    <TouchableOpacity
      style={[callStyles.choiceButton, disabled ? { opacity: 0.6 } : null]}
      onPress={() => onPress(option)}
      disabled={disabled}
    >
      <Text style={callStyles.choiceButtonText}>{option.text}</Text>
    </TouchableOpacity>
  );
}
