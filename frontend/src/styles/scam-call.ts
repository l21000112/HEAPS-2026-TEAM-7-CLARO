import { StyleSheet } from 'react-native';

// Beige (cat) palette - applied mid-call only.
const BEIGE_BG       = '#F4ECDD'; // page background
const BEIGE_SURFACE  = '#FBF5EA'; // dialogue box + option buttons
const BEIGE_BORDER   = '#D9C7AE'; // warm taupe outline
const TEXT_ESPRESSO  = '#3F352E'; // primary text on beige
const TEXT_TAUPE     = '#8C7B66'; // muted labels
export const callStyles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#1a365d', 
    alignItems: 'center', 
    paddingTop: 80 
  },
  callerName: { 
    color: '#fff',
    fontSize: 32, 
    fontWeight: 'bold', 
    textAlign: 'center', 
    paddingHorizontal: 20, 
    marginBottom: 30 
  },
  /*callerNumber: { 
    fontSize: 22, 
    color: '#cbd5e1', 
    marginBottom: 60 
  },*/
  profileContainer: { 
    marginBottom: 70, 
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: '#334155', 
    borderRadius: 100,
  },
  incomingStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 30,
  },
  incomingIcon: {
    marginRight: 8,
  },
  incomingStatusText: {
    fontSize: 16,
    color: '#cbd5e1',
    fontWeight: '500',
  },
  buttonContainer: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    width: '65%', 
    position: 'absolute', 
    bottom: 80 
  },
  iconButton: { 
    width: 75, 
    height: 75, 
    borderRadius: 40, 
    justifyContent: 'center', 
    alignItems: 'center', 
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  answerButton: { 
    backgroundColor: '#4ade80' 
  },
  declineButton: { 
    backgroundColor: '#ef4444'
  },
  buttonText: { 
    color: '#ffffff', 
    fontSize: 18, 
    fontWeight: 'bold' 
  },
  containerResult: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 20
  },
  heading: { 
    fontSize: 32, 
    fontWeight: 'bold', 
    marginBottom: 20 
  },
  card: {  
    padding: 20, 
    borderRadius: 12, 
    width: '100%', 
    marginBottom: 40 
  },
  detail: { 
    fontSize: 18, 
    marginBottom: 10, 
    color: '#334155' 
  },
  explanation: { 
    color: "#64748b",
    fontSize: 16, 
    marginTop: 15, 
    fontStyle: 'italic', 
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
    fontWeight: 'bold' 
  },
  callDuration: {
    color: TEXT_TAUPE,
    fontSize: 14,
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  dialogueBox: {
    borderWidth: 1,
    borderColor: BEIGE_BORDER,
    backgroundColor: BEIGE_SURFACE,
    borderRadius: 16,        // rounded to match the option boxes
    padding: 20,
    width: '100%',
    marginBottom: 30,
  },
  dialogueLabel: {
    color: TEXT_TAUPE,
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  dialogueText: {
    color: TEXT_ESPRESSO,
    fontSize: 15,
    lineHeight: 24,
  },
  promptLabel: {
    color: TEXT_TAUPE,
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1.5,
    alignSelf: 'flex-start',
    marginLeft: '7.5%',
    marginBottom: 15,
  },
  choiceButton: {
    backgroundColor: BEIGE_SURFACE,
    borderWidth: 1,
    borderColor: BEIGE_BORDER,
    borderRadius: 16,        // ← rounded dialogue option boxes
    width: '100%',
    paddingVertical: 15,
    paddingHorizontal: 15,
    marginBottom: 10,
    justifyContent: 'center',
  },
  choiceButtonText: {
    color: TEXT_ESPRESSO,
    fontSize: 15,
  },
  hangupContainer: {
    position: 'absolute',
    bottom: 0,
    paddingBottom: 60,
    alignSelf: 'center', 
  }
});