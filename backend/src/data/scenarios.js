const scenarios = [
  {
    id: 1,
    isScam: true,
    callerName: "DBS Bank",
    declineReason:
      "Hanging up is the safest and most effective response to a suspicious call. By immediately ending the conversation, you cut off the scammer's ability to manipulate you using high-pressure tactics.",
    declineReasonSimple:
      "Hanging up was smart. Ending the call stops the scammer from scaring you into giving your details.",
    correctReason:
      "Hanging up immediately is the correct response to a suspicious call. It prevents scammers from using pressure tactics to manipulate you.",
    dialogue:
      "This is DBS. We have detected suspicious activity in your bank account, likely involved in a money-laundering case. Please provide your bank login details to verify your identity. Failure to comply will result in your account temporarily suspended until further notice.",
    options: [
      {
        id: 1,
        text: "\"I don't want my account suspended, my account ID and password are...\"",
        isCorrect: false,
        reason:
          "Remember that scammers are able to spoof their Caller name to appear legitimate. They also rely on fear by appealing to your desire to quickly resolve a fabricated crisis. Banks will never ask for your personal login details or information over the phone.",
        reasonSimple:
          "That was unsafe. Banks never ask for your login details by phone. Scammers can fake the caller name to look real.",
      },
      {
        id: 2,
        text: "\"I'm not comfortable disclosing my login details, but you can send an SMS OTP to verify my identity.\"",
        isCorrect: false,
        reason:
          "Remember that scammers are able to spoof their Caller name to appear legitimate. This is a dangerous trap! If you agree to an OTP, the scammer will trigger a real password-reset or money transfer on their end, ask you to read the code to 'verify' yourself, and then use it to drain your account.",
        reasonSimple:
          "Never share an SMS code. A scammer can use that code to take money from your account.",
      },
      {
        id: 3,
        text: "\"I'm hanging up now.\"",
        isCorrect: true,
        reason:
          "Hanging up is the safest and most effective response to a suspicious call. By immediately ending the conversation, you cut off the scammer's ability to manipulate you using high-pressure tactics.",
        reasonSimple:
          "Great job hanging up. That stops the scammer from pressuring you.",
      },
    ],
  },
  {
    id: 2,
    isScam: false,
    callerName: "Unknown Caller",
    declineReason:
      "Do not blindly assume that Unknown Callers are all scammers. It's good to be suspicious, but ignoring them entirely could cause you to miss emergencies or important deliveries. Answer cautiously, but be ready to hang up the moment they ask for money or personal details.",
    declineReasonSimple:
      "Not every unknown call is a scam. Answer carefully, but hang up if they ask for money or private details.",
    correctReason:
      "Correct! Relying on in-app push notifications is the certified, secure way to verify transactions. As scammers cannot trigger notifications inside your official banking app, this is a safe way to proceed.",
    dialogue:
      "Good afternoon, my name is Sarah from the DBS Fraud Prevention team. We detected an unusual transaction of $400 on your Visa card today. To securely verify your identity and review this transaction, I have just sent a secure notification to your registered DBS digibank app. Please open your app now to review and authorize or decline the transaction. I will stay on the line.",
    options: [
      {
        id: 1,
        text: "\"Okay, I will check the notification now.\"",
        isCorrect: true,
        reason:
          "Correct! Relying on in-app push notifications is the certified, secure way to verify transactions. As scammers cannot trigger notifications inside your official banking app, this is a safe way to proceed.",
        reasonSimple:
          "Good choice. Checking the bank app yourself is a safe way to check if a payment is real.",
      },
      {
        id: 2,
        text: "\"If you are really from DBS, tell me the first 4 numbers of my NRIC to prove it.\"",
        isCorrect: false,
        reason:
          "The Singapore government is phasing out the use of full/partial NRIC numbers for authentication as they are unreliable and multiple people can share the same partial combination.",
        reasonSimple:
          "NRIC numbers are not a safe way to prove who someone is. Do not use them like a password.",
      },
      {
        id: 3,
        text: "\"I don't have the app installed, but if you ask me personal questions, I can verify those verbally instead.\"",
        isCorrect: false,
        reason:
          "Never volunteer to bypass secure protocols, you should never disclose personal information over an unsolicited call.",
        reasonSimple:
          "Do not share personal details on a cold call. Stay with the bank's safe app checks instead.",
      },
    ],
  },
  {
    id: 3,
    isScam: false,
    callerName: "Mom",
    declineReason:
      "That was a real call from your Mom, why'd you just hang up without responding...",
    declineReasonSimple:
      "That was a real call from Mom. Not every call is a scam.",
    correctReason:
      "This was a normal call from a known contact with no red flags.",
    dialogue:
      "Hey, just calling to let you know that Grandma will be coming over for Dinner tonight!",
    options: [
      {
        id: 1,
        text: "\"Okay, thanks!\"",
        isCorrect: true,
        reason:
          "Correct! No red flags here, just Mum letting you know of Grandma's arrival in advance!",
        reasonSimple:
          "Nice. This was a normal call from Mom with nothing scary or scammy in it.",
      },
    ],
  },
  {
    id: 4,
    isScam: true,
    callerName: "Pulse Advertising",
    declineReason:
      "Scammers often use highly targeted, flattering details found online about your specific technical skills to build false trust. Ending the call immediately is the safest action.",
    declineReasonSimple:
      "Hanging up was right. Fake job offers try to flatter you, then ask for money. That is a scam.",
    correctReason:
      "Recognizing the red flags of a job scam (like an upfront fee) and hanging up is the correct action to protect yourself.",
    dialogue:
      "Hi there, I am calling from the HR department of a global advertising network. We reviewed your profile on LinkedIn and are highly impressed by your expertise in various fields. We would like to offer you an immediate, fully remote position. To secure this role and facilitate your background check, we just need you to transfer a fully refundable onboarding fee of $200 via PayNow to +65 98765432.",
    options: [
      {
        id: 1,
        text: "That's great! I believe I have heard of your company before and I can't wait to join the team! I'll transfer the fee as soon as possible.",
        isCorrect: false,
        reason:
          "Legitimate employers will never ask candidates to pay an upfront fee for onboarding, background checks, or equipment. This is a classic hallmark of an employment scam!",
        reasonSimple:
          "Real jobs never ask you to pay money first. Asking for a fee is a big scam warning.",
      },
      {
        id: 2,
        text: "This is obviously a scam so I'm hanging up.",
        isCorrect: true,
        reason:
          "Scammers often use highly targeted, flattering details found online about your specific technical skills to build false trust. Ending the call immediately is the safest action.",
        reasonSimple:
          "Great job hanging up. Fake job calls try to praise you, then ask for money.",
      },
      {
        id: 3,
        text: "I am interested in the role but can we just deduct the fee from my first paycheck instead?",
        isCorrect: false,
        reason:
          "Negotiating with a scammer keeps you engaged and vulnerable. Real recruiters follow formal interview processes and will never 'hire' you on the spot over an unsolicited phone call.",
        reasonSimple:
          "Do not keep talking about fees with a stranger. Real jobs use proper interviews, not surprise phone hires.",
      },
    ],
  },
  {
    id: 5,
    isScam: true,
    callerName: "Singapore Police Force",
    declineReason:
      "Hanging up is the best response. Real law enforcement officers will never call to demand money or ask for your bank details to clear your name.",
    declineReasonSimple:
      "Hanging up was right. Real police will never call to ask for your money or bank details.",
    dialogue:
      "This is Inspector Chen from the Singapore Police Force. Your identity was used in a money-laundering case. You must transfer $5,000 to this secure state account immediately for investigation, or a warrant will be issued for your arrest.",
    options: [
      {
        id: 1,
        text: "\"I will transfer the money right away, please do not arrest me.\"",
        isCorrect: false,
        reason:
          "Fear is a common tactic. The police will never ask you to transfer money to a 'secure state account' over the phone.",
        reasonSimple:
          "Scammers try to scare you. The police never ask you to send money by phone.",
      },
      {
        id: 2,
        text: "\"Can I come down to the police station to sort this out?\"",
        isCorrect: false,
        reason:
          "While better than paying, staying on the line allows the scammer to threaten or manipulate you further. The safest action is to hang up.",
        reasonSimple:
          "Do not keep talking to them. They will try to trick you. Just hang up the phone.",
      },
      {
        id: 3,
        text: "\"I am hanging up now.\"",
        isCorrect: true,
        reason:
          "Hanging up cuts off their ability to pressure you. If you are worried, you can call the official police hotline yourself.",
        reasonSimple:
          "Good job. Hanging up stops them from scaring you. You can always call the real police number yourself.",
      },
    ],
  },
  {
    id: 6,
    isScam: true,
    callerName: "SingPost Delivery",
    declineReason:
      "Hanging up protects your information. Scammers often pretend to hold parcels hostage to steal your credit card details or charge fake customs fees.",
    declineReasonSimple:
      "Hanging up was smart. Scammers lie about lost packages to steal your card details.",
    dialogue:
      "Hello, this is an automated message from SingPost. Your international parcel could not be delivered due to unpaid customs duties of $3.50. Press 1 to speak to an agent and pay by credit card, or your parcel will be destroyed.",
    options: [
      {
        id: 1,
        text: "\"I will press 1 and pay the $3.50 so I can get my package.\"",
        isCorrect: false,
        reason:
          "This is a phishing scam. The small fee is a trick to get you to type your credit card details into a fake system, which they will use to steal much more money.",
        reasonSimple:
          "This is a trick. The small fee is just an excuse to steal your credit card numbers.",
      },
      {
        id: 2,
        text: "\"I'm hanging up.\"",
        isCorrect: true,
        reason:
          "Hanging up is the correct choice. If you are expecting a parcel, always check the official tracking app or website, not a random phone call.",
        reasonSimple:
          "Great choice. If you have a package coming, check the real delivery app, not a random call.",
      },
    ],
  },
  {
    id: 7,
    isScam: false,
    callerName: "Shopee Courier",
    declineReason:
      "Ignoring unknown numbers entirely means you might miss real delivery drivers trying to find your address.",
    declineReasonSimple:
      "You might miss a real delivery. It is okay to answer, just do not give them money or passwords.",
    dialogue:
      "Hi, I am the courier delivering your Shopee parcel. I am at your block but I can't find the lift lobby. Can you help guide me?",
    options: [
      {
        id: 1,
        text: "\"Sure, just walk past the playground and you will see Lobby B.\"",
        isCorrect: true,
        reason:
          "This is a standard delivery call. Helping them find the location is safe, provided they don't ask for payment or sensitive info.",
        reasonSimple:
          "This is a normal call. Helping the driver find your home to deliver your parcel is safe.",
      },
      {
        id: 2,
        text: "\"You're lying! If you aren't, tell me my full NRIC number then.\"",
        isCorrect: false,
        reason:
          "Delivery drivers do not have your NRIC number. Making unreasonable demands for verification can prevent you from receiving your items.",
        reasonSimple:
          "Delivery drivers do not know your private numbers. Asking them for it will just delay your package.",
      },
    ],
  },
  {
    id: 8,
    isScam: true,
    callerName: "Singtel Tech Support",
    declineReason:
      "Hanging up stops the scam. Tech support scammers try to trick you into downloading software that lets them control your phone or computer.",
    declineReasonSimple:
      "Hanging up was good. Fake tech support tries to trick you into giving them control of your phone.",
    dialogue:
      "Good morning, I am calling from Singtel technical support. We detected that your home Wi-Fi has been hacked. To fix this, please download the 'TeamViewer' app on your phone so I can secure your network.",
    options: [
      {
        id: 1,
        text: "\"Okay, I am downloading the app now to help you fix my Wi-Fi.\"",
        isCorrect: false,
        reason:
          "Never download remote access apps like TeamViewer or AnyDesk on an unsolicited call. Scammers use these to take control of your device and log into your bank accounts.",
        reasonSimple:
          "Never download apps because a stranger asked you to. They can use the app to control your phone and steal money.",
      },
      {
        id: 2,
        text: "\"I'm hanging up right now.\"",
        isCorrect: true,
        reason:
          "Hanging up is the safest move. Telecom companies will not call you out of the blue to demand you install remote-control software.",
        reasonSimple:
          "Good job. Real internet companies will not call you to make you download remote apps.",
      },
    ],
  },
  {
    id: 9,
    isScam: true,
    callerName: "+65 8123 4567",
    declineReason:
      "Hanging up was the right move. The 'guess who' scam relies on you giving them a name they can steal to trick you.",
    declineReasonSimple:
      "Hanging up was smart. Scammers want you to guess their name so they can pretend to be your friend to make scamming you easier.",
    dialogue:
      "Hey! Long time no see. Do you remember who I am? I just changed my number, save this one!",
    options: [
      {
        id: 1,
        text: "\"Is this Uncle David?\"",
        isCorrect: false,
        reason:
          "If you guess a name, the scammer will immediately agree and pretend to be that person. They will then usually ask for an urgent loan a few days later.",
        reasonSimple:
          "Do not guess names. If you guess a name, the scammer will pretend to be that person and ask for money later.",
      },
      {
        id: 2,
        text: "\"I don't recognize your voice. I'm hanging up.\"",
        isCorrect: true,
        reason:
          "If they refuse to identify themselves, it is highly likely a 'fake friend' scam. Hanging up is the best defense.",
        reasonSimple:
          "Great job. If they will not say their name, they are trying to trick you. Hanging up is safe.",
      },
    ],
  },
  {
    id: 10,
    isScam: false,
    callerName: "Smile Dental Clinic",
    declineReason:
      "Hanging up on your clinic might mean missing important updates about your appointment.",
    declineReasonSimple:
      "You might miss your reminder. It is okay to talk to your clinic about your visit.",
    dialogue:
      "Hi {{name}}, this is Smile Dental. Just calling to remind you about your dental appointment tomorrow at 10 AM. Will you be able to make it?",
    options: [
      {
        id: 1,
        text: "\"Yes, I will be there. Thank you!\"",
        isCorrect: true,
        reason:
          "This is a normal administrative call. Confirming attendance does not require sharing sensitive information.",
        reasonSimple:
          "This is a normal call. It is safe to say yes without sharing sensitive information.",
      },
    ],
  },
  {
    id: 11,
    isScam: true,
    callerName: "CPF Board",
    declineReason:
      "Hanging up protects your retirement funds. Scammers spoof government numbers to panic you into giving up your Singpass details.",
    declineReasonSimple:
      "Hanging up was right. Scammers fake government names to steal your passwords.",
    dialogue:
      "This is an urgent call from the CPF Board. Your retirement account has been locked due to suspicious login attempts. Please provide your Singpass password so we can verify your identity and unlock your funds.",
    options: [
      {
        id: 1,
        text: "\"I don't want my account locked, my password is...\"",
        isCorrect: false,
        reason:
          "Your Singpass password is the key to all your government data and financial services. No legitimate agency will ever ask for it over the phone.",
        reasonSimple:
          "Never tell anyone your password on the phone. Real government workers will never ask for it.",
      },
      {
        id: 2,
        text: "\"I'm hanging up. I will check my CPF app myself.\"",
        isCorrect: true,
        reason:
          "Excellent! Verifying the status through the official app or website is the correct and secure way to handle alerts.",
        reasonSimple:
          "Great choice. Checking the real app yourself is the safest way to see if there is a problem.",
      },
    ],
  },
  {
    id: 12,
    isScam: true,
    callerName: "Lucky Draw Center",
    declineReason:
      "Hanging up prevents you from paying fake taxes on a prize that doesn't exist.",
    declineReasonSimple:
      "Hanging up was smart. Fake prize calls just want to steal your money.",
    dialogue:
      "Congratulations! Your phone number has been selected to win $10,000 in our grand annual lucky draw! To process your winnings, you just need to pay a small administrative tax of $150 via bank transfer.",
    options: [
      {
        id: 1,
        text: "\"Wow, $10,000! I will transfer the $150 right now.\"",
        isCorrect: false,
        reason:
          "This is a classic advance-fee scam. If you have to pay money to claim a prize, it is not a real prize.",
        reasonSimple:
          "Real prizes are free. If you have to pay money to get a prize, it is a scam.",
      },
      {
        id: 2,
        text: "\"I didn't enter a lucky draw. I'm hanging up.\"",
        isCorrect: true,
        reason:
          "Hanging up is the correct response. You cannot win a lottery or draw that you did not enter.",
        reasonSimple:
          "Good job. You cannot win a game you did not play. Hanging up is the best choice.",
      },
    ],
  },
  {
    id: 13,
    isScam: false,
    callerName: "Foodpanda Delivery",
    declineReason:
      "Hanging up on your food delivery driver means your food might get cold or lost!",
    declineReasonSimple:
      "You might lose your food. It is okay to help the driver find your door.",
    dialogue:
      "Hi, I have your food order but the security guard at the gate needs you to authorize my entry. Can you call the guardhouse?",
    options: [
      {
        id: 1,
        text: "\"Sure, I will call the guardhouse to let you in.\"",
        isCorrect: true,
        reason:
          "This is a normal procedure for many condominiums. It's safe to authorize legitimate deliveries.",
        reasonSimple:
          "This is a normal call. Informing the guard to let your food in is safe.",
      },
      {
        id: 2,
        text: "\"Just leave it at the gate, I don't trust you.\"",
        isCorrect: false,
        reason:
          "Being overly suspicious here will just result in a bad delivery experience. The rider isn't asking for sensitive data, just access.",
        reasonSimple:
          "You do not need to be scared. The driver just wants to give you your food, not steal your secrets.",
      },
    ],
  },
  {
    id: 14,
    isScam: true,
    callerName: "Unknown Number",
    declineReason:
      "Hanging up is terrifying in this scenario, but it prevents you from being manipulated by scammers who use fake screaming to simulate a kidnapping.",
    declineReasonSimple:
      "Hanging up is scary but smart. Scammers use fake crying sounds to trick you into paying them.",
    dialogue:
      "[Crying noises] We have your child. Transfer $50,000 to this account or you will never see them again. Do not hang up or call the police or else!",
    options: [
      {
        id: 1,
        text: "\"Please don't hurt them! I will send the money!\"",
        isCorrect: false,
        reason:
          "Scammers prey on panic. The crying is usually a recording or an actor. Paying them does not guarantee anything and only rewards the scammer.",
        reasonSimple:
          "Scammers use fake crying to scare you. Sending money to strangers is not safe.",
      },
      {
        id: 2,
        text: "\"I'm hanging up and calling my child directly to check on them.\"",
        isCorrect: true,
        reason:
          "This is the correct move. Hang up immediately and call your loved one's actual number. 99% of the time, they are perfectly safe at school or work.",
        reasonSimple:
          "Great choice. Hang up and call your family yourself to make sure they are safe.",
      },
    ],
  },
  {
    id: 15,
    isScam: true,
    callerName: "Ministry of Health Survey",
    declineReason:
      "Hanging up prevents scammers from extracting personal information under the guise of an official survey.",
    declineReasonSimple:
      "Hanging up was good. Scammers fake surveys to ask for your private details.",
    dialogue:
      "Hello, I am calling from the Ministry of Health for a quick health survey. If you complete it, we will send you a $20 NTUC voucher. We just need your full NRIC, home address, and bank account number to disburse the reward.",
    options: [
      {
        id: 1,
        text: "\"Sure I'll participate in the survey, my NRIC, home address, and bank details are...\"",
        isCorrect: false,
        reason:
          "Real surveys do not require highly sensitive information like your bank account number. The 'reward' is bait to steal your identity.",
        reasonSimple:
          "Real surveys do not ask for your bank numbers. The free gift is a trick to steal your secrets.",
      },
      {
        id: 2,
        text: "\"I don't give out my details over the phone. Goodbye.\"",
        isCorrect: true,
        reason:
          "Hanging up is the best defense. Never trade your personal information for small rewards on cold calls.",
        reasonSimple:
          "Great job. Never trade your private details for small gifts on the phone.",
      },
    ],
  },
  {
    id: 16,
    isScam: false,
    callerName: "Colleague John",
    declineReason:
      "Hanging up on a coworker might cause delays in your work projects.",
    declineReasonSimple:
      "You might miss work news. It is okay to talk to people you work with.",
    dialogue:
      "Hey {{name}}, it's John from marketing. The client wants to change the presentation colors to blue. Can you update the slides before the 3 PM meeting?",
    options: [
      {
        id: 1,
        text: "\"Sure, I will update the slides now.\"",
        isCorrect: true,
        reason:
          "This is a standard workplace interaction with a known contact. No sensitive personal data is being requested.",
        reasonSimple:
          "This is a normal work call. Helping a friend from work is safe.",
      },
    ],
  },
  {
    id: 17,
    isScam: true,
    callerName: "IRAS Tax Office",
    declineReason:
      "Hanging up avoids the trap of fake refunds, which are designed to steal your banking credentials.",
    declineReasonSimple:
      "Hanging up was right. Scammers use fake refunds to trick you into sharing your bank password.",
    dialogue:
      "Good afternoon. This is the Inland Revenue Authority of Singapore. You have overpaid your taxes and are owed a refund of $450. I am sending a link to your phone now. Please click it and log into your bank to claim the refund.",
    options: [
      {
        id: 1,
        text: "\"Thank you, I will click the link and log in right now.\"",
        isCorrect: false,
        reason:
          "IRAS does not send SMS links asking you to log into your bank. The malicious link is a phishing site designed to look like your bank to steal your login details.",
        reasonSimple:
          "Government entities will never send links. This is a scam link and will take you to a fake site that steals your passwords.",
      },
      {
        id: 2,
        text: "\"I'm hanging up. I will check my tax portal directly.\"",
        isCorrect: true,
        reason:
          "Perfect response. Always navigate to official government portals yourself rather than clicking links or following instructions from a cold call.",
        reasonSimple:
          "Great choice. Checking the real government website yourself is the safe way to see if it is true.",
      },
    ],
  },
  {
    id: 18,
    isScam: true,
    callerName: "Fast Cash Loans",
    declineReason:
      "Hanging up prevents you from getting entangled with illegal moneylenders who use extortion tactics.",
    declineReasonSimple:
      "Hanging up was smart. Illegal loan callers will trap you and ask for more money.",
    dialogue:
      "Need cash fast? We are offering a special 0% interest loan today for up to $10,000. Approval in 5 minutes. You just need to transfer a $500 processing fee first to show your commitment.",
    options: [
      {
        id: 1,
        text: "\"I need the money, I will transfer the fee.\"",
        isCorrect: false,
        reason:
          "Legitimate lenders deduct fees from the loan amount; they never ask you to pay money to borrow money. This is an illegal loan scam.",
        reasonSimple:
          "Real banks do not make you pay money to borrow money. This is a trick.",
      },
      {
        id: 2,
        text: "\"I don't need a loan, goodbye.\"",
        isCorrect: true,
        reason:
          "Hanging up is the only safe option. Engaging with illegal moneylenders can lead to severe harassment.",
        reasonSimple:
          "Good job. Saying no to strange loan calls keeps you safe from bad people.",
      },
    ],
  },
  {
    id: 19,
    isScam: false,
    callerName: "Happy Paws Vet",
    declineReason:
      "Hanging up means your pet might miss their important vaccinations.",
    declineReasonSimple:
      "Your pet might miss their doctor visit. It is okay to answer calls from your vet.",
    dialogue:
      "Hi {{name}}, this is Happy Paws Clinic. Your dog Buster is due for his annual rabies booster shot next week. Would you like to schedule a time to come in?",
    options: [
      {
        id: 1,
        text: "\"Yes, let's book a slot for Tuesday afternoon.\"",
        isCorrect: true,
        reason:
          "This is a routine reminder from a known clinic. Booking an appointment does not expose you to risk.",
        reasonSimple:
          "This is a normal call. Booking a time for your pet's checkup is safe.",
      },
    ],
  },
  {
    id: 20,
    isScam: true,
    callerName: "Children's Hope Charity",
    declineReason:
      "Hanging up protects your goodwill from being exploited by fake charities.",
    declineReasonSimple:
      "Hanging up was right. Scammers pretend to be charities to steal your donation.",
    dialogue:
      "Hello, we are collecting urgent donations for an orphanage that caught fire yesterday. Every dollar helps. Can you provide your credit card number over the phone to make a quick $50 donation?",
    options: [
      {
        id: 1,
        text: "\"That's so sad, my card number is...\"",
        isCorrect: false,
        reason:
          "Scammers use emotional stories to rush you. Never give credit card details over the phone to unverified callers. Always donate through official, verified platforms.",
        reasonSimple:
          "Scammers use sad stories to trick you. Never read your credit card numbers on the phone.",
      },
      {
        id: 2,
        text: "\"I prefer to donate through official channels. I'll do my own research first before deciding.\"",
        isCorrect: true,
        reason:
          "Excellent. It is always better to hang up and look up the charity yourself to ensure your money actually goes to a good cause.",
        reasonSimple:
          "Great job. If you want to help, use real websites to give money, not a random phone call.",
      },
    ],
  },
  {
    id: 21,
    isScam: true,
    callerName: "Crypto Kings",
    declineReason:
      "Hanging up saves you from losing your savings to a fake investment scheme.",
    declineReasonSimple:
      "Hanging up was smart. Fake money experts just want to steal your savings.",
    dialogue:
      "Hi, I am a senior crypto analyst. We have a guaranteed investment plan that will double your money in 3 days. I just need you to send $1,000 in Bitcoin to our trading wallet to get started.",
    options: [
      {
        id: 1,
        text: "\"Guaranteed returns? Of course I will send the Bitcoin now.\"",
        isCorrect: false,
        reason:
          "All investments carry risk. Anyone promising 'guaranteed' high returns in a short time on a cold call is a scammer.",
        reasonSimple:
          "Promises of fast, easy money are usually lies. Sending them money means losing it forever.",
      },
      {
        id: 2,
        text: "\"I am not interested. Goodbye.\"",
        isCorrect: true,
        reason:
          "Hanging up immediately is the best way to handle investment scams. Never trust unsolicited financial advice.",
        reasonSimple:
          "Good choice. Saying no to strange money offers is the best way to keep your savings safe.",
      },
    ],
  },
];

module.exports = { scenarios };
