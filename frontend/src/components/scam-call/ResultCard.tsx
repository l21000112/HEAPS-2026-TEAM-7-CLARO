import { View, Text } from 'react-native';
import { callStyles } from '../../styles/scam-call';
import { CallResult } from '../../features/scam-call/models';

interface ResultCardProps {
  result: CallResult;
}

export default function ResultCard({ result }: ResultCardProps) {
  return (
    <View style={callStyles.card}>
      <Text style={callStyles.explanation}>{result.reason}</Text>
    </View>
  );
}