import { StyleSheet } from 'react-native';

export const whatsAppStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  notificationCard: {
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 12,
    padding: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#25d366',
  },
  notificationApp: {
    color: '#25d366',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 8,
  },
  notificationTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  notificationBody: {
    fontSize: 15,
    lineHeight: 22,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 20,
    marginTop: 32,
  },
  primaryButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#e9edef',
    fontSize: 16,
    fontWeight: '700',
  },
  threadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  contactName: {
    fontSize: 18,
    fontWeight: '700',
  },
  contactNumber: {
    fontSize: 13,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerActionButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  headerActionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  messageList: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 16,
  },
  bubbleRow: {
    marginBottom: 8,
    maxWidth: '80%',
  },
  bubbleRowInbound: {
    alignSelf: 'flex-start',
  },
  bubbleRowOutbound: {
    alignSelf: 'flex-end',
  },
  bubble: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  bubbleInbound: {
    backgroundColor: '#3d4d57',
  },
  bubbleOutbound: {
    backgroundColor: '#067460',
  },
  bubbleText: {
    color: '#e9edef',
    fontSize: 15,
    lineHeight: 21,
  },
  typingIndicator: {
    color: '#8696a0',
    fontSize: 13,
    fontStyle: 'italic',
    marginLeft: 16,
    marginBottom: 8,
  },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  composerInput: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 15,
  },
  sendButtonText: {
    color: '#0b141a',
    fontSize: 18,
    fontWeight: '700',
  },
  limitHint: {
    color: '#8696a0',
    fontSize: 11,
    textAlign: 'center',
    paddingBottom: 6,
  },
  containerResult: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  heading: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 30,
  },
  card: {
    backgroundColor: '#fff5ee',
    padding: 20,
    borderRadius: 12,
    width: '100%',
    elevation: 3,
    marginBottom: 40,
  },
  detail: {
    marginBottom: 10,
    color: '#334155',
  },
  explanation: {
    fontSize: 16,
    marginTop: 5,
    marginBottom: 15,
    fontStyle: 'italic',
    color: '#64748b',
  },
  buttonResult: { 
    backgroundColor: "#acd9eb",
    margin: 20,
    padding: 15, 
    borderRadius: 8, 
    elevation: 3,
    width: '80%', 
    alignItems: 'center' 
  },
  buttonResultText: {
    color: "#2c3847",
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalView: { 
    margin: 20, 
    backgroundColor: 'white', 
    borderRadius: 20, 
    padding: 35, 
    alignItems: 'center', 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.25, 
    shadowRadius: 4, 
    elevation: 5 
  },
  centeredView: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: 'rgba(0,0,0,0.5)' 
  },
});
