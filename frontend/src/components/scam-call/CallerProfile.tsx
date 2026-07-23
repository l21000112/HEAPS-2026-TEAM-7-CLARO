import { View, Text } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { callStyles } from '../../styles/scam-call';

interface CallerProfileProps {
  callerName: string;
}

export default function CallerProfile({ callerName }: CallerProfileProps) {
  return (
    <>
      <Text style={callStyles.callerName}>{callerName}</Text>
      <View style={callStyles.profileContainer}>
        <FontAwesome name="user-circle" size={160} color="#cbd5e1" />
      </View>
    </>
  );
}