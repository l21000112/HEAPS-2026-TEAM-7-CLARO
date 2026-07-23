import { View, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { callStyles } from '../../styles/scam-call';
import { useTranslation } from 'react-i18next';

export default function IncomingStatus() {
  const { t } = useTranslation();
  return (
    <View style={callStyles.incomingStatusContainer}>
      <MaterialIcons name="phone-in-talk" size={16} color="#cbd5e1" style={callStyles.incomingIcon} />
      <Text style={callStyles.incomingStatusText}>{t('call.incomingCall')}</Text>
    </View>
  );
}