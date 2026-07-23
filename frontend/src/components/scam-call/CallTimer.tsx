import { Text } from 'react-native';
import { callStyles } from '../../styles/scam-call';

interface CallTimerProps {
  seconds: number;
}

export default function CallTimer({ seconds }: CallTimerProps) {
  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const secs = (totalSeconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  return (
    <Text style={callStyles.callDuration}>
      {formatTime(seconds)}
    </Text>
  );
}