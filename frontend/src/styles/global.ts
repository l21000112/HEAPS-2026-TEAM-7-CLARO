import { StyleSheet } from 'react-native';

export const colors = {
  background: '#1a1a2e',
  header: '#242444',
  surface: '#2a2a4a',
  primary: '#4fc3f7',
  text: '#ffffff',
  textSecondary: '#a0a0b0',
  alert: '#ff5252',
};

export const globalStyles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 30,
    marginBottom: 16,
  },
  empty: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
    date: {
    fontSize: 14,
    color: '#a0a0b0',
    marginTop: 4,
    marginBottom: 30,
  },
  button: { 
    backgroundColor: '#0f172a', 
    padding: 15, 
    borderRadius: 8, 
    width: '100%', 
    alignItems: 'center' 
  },
  buttonText: { 
    color: '#ffffff', 
    fontSize: 16, 
    fontWeight: 'bold' 
  },
  practiceBanner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    zIndex: 10,
  },
  practiceText: {
    color: '#94a3b8',
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 2,
  }
});