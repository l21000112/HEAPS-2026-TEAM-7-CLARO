const whatsappScenarios = [
  {
    id: 1,
    isScam: true,
    contact: { displayName: "HR - GlobalTech", phoneNumber: "+65 8123 4567" },
    scenarioBrief:
      "You are a fake recruiter on WhatsApp. Offer a remote job, then ask for a refundable PayNow onboarding fee of $150. Stay in character. Keep replies short like real WhatsApp messages.",
    declineReason:
      "Legitimate employers never ask for upfront fees via PayNow on WhatsApp. Blocking and reporting is the safest response.",
    correctReason:
      "The safest action is to block and report suspicious contacts on WhatsApp, especially when they ask for money for a job offer.",
    openingMessages: [
      {
        id: "m1",
        direction: "inbound",
        body: "Hi! I reviewed your LinkedIn profile - we have an immediate remote analyst role. Interested?",
      },
    ],
  },
  {
    id: 2,
    isScam: true,
    contact: { displayName: "SingPost Delivery", phoneNumber: "+65 9000 1111" },
    scenarioBrief:
      "You impersonate SingPost. Claim a parcel is held and ask the user to pay a small redelivery fee via a link. Push urgency. Short SMS-style messages.",
    declineReason:
      "Delivery fee scams use fake links to steal payment details. Check the official SingPost app or website instead of paying via chat links.",
    correctReason:
      "The correct action is to ignore the message and check the official SingPost website or app directly, rather than clicking a suspicious link.",
    openingMessages: [
      {
        id: "m1",
        direction: "inbound",
        body: "SingPost: Your parcel is on hold. Pay $1.50 redelivery fee within 2 hours: bit.ly/redeliver-sg",
      },
    ],
  },
  {
    id: 3,
    isScam: false,
    contact: { displayName: "Mom", phoneNumber: "+65 9123 4567" },
    scenarioBrief:
      "You are the user's mom on WhatsApp. Casually remind them about dinner tonight. No requests for money or personal data.",
    declineReason:
      "That was a genuine message from family. Blocking without reading could mean missing something important - but never share OTPs or transfer money without verifying by call.",
    correctReason:
      "This is a genuine message from a family member with no suspicious requests. Replying normally is the correct action.",
    openingMessages: [
      {
        id: "m1",
        direction: "inbound",
        body: "Hey, grandma is coming for dinner tonight around 7. Can you pick up dessert?",
      },
    ],
  },
  {
    id: 4,
    isScam: true,
    contact: { displayName: "SPF Official", phoneNumber: "+65 8765 4321" },
    scenarioBrief: "You impersonate the Singapore Police Force. Tell the user their bank account is frozen due to illegal activity and they must send their NRIC photo. Keep replies short.",
    declineReason: "The Singapore Police Force and other government agencies do not communicate official business or request personal documents like NRIC via WhatsApp.",
    declineReasonSimple: "Real police officers will not ask for your ID card on messaging apps.",
    openingMessages: [
      {
        id: "m1",
        direction: "inbound",
        body: "URGENT: This is the Singapore Police Force. Your bank account is linked to a crime. Reply with a photo of your NRIC to verify your identity."
      }
    ]
  },
  {
    id: 5,
    isScam: true,
    contact: { displayName: "NinjaVan Alert", phoneNumber: "+65 9112 2233" },
    scenarioBrief: "You impersonate a delivery company. Claim a parcel is stuck at the warehouse due to an incomplete address and provide a link to update it. Push urgency.",
    declineReason: "Delivery companies do not send unverified links via WhatsApp asking for address updates or extra fees. Always track parcels through the official app.",
    declineReasonSimple: "Delivery drivers will not send you links to pay money or change your address.",
    openingMessages: [
      {
        id: "m1",
        direction: "inbound",
        body: "NinjaVan: Your parcel delivery failed due to a missing house number. Update your address here within 24 hours: bit.ly/nv-update-sg"
      }
    ]
  },
  {
    id: 6,
    isScam: false,
    contact: { displayName: "Bro", phoneNumber: "+65 9888 7766" },
    scenarioBrief: "You are the user's sibling. Ask them if they can buy some milk on their way home. No requests for money transfers.",
    declineReason: "This is a genuine message from a family member asking for a simple favor. There are no suspicious links or urgent demands for money.",
    declineReasonSimple: "This is a real message from your family. It is safe.",
    openingMessages: [
      {
        id: "m1",
        direction: "inbound",
        body: "Hey {{name}}, can you grab a carton of milk on your way home? We just ran out "
      }
    ]
  },
  {
    id: 7,
    isScam: true,
    contact: { displayName: "Govt CDC Updates", phoneNumber: "+65 8444 5555" },
    scenarioBrief: "You impersonate a government channel offering extra CDC vouchers. Provide a link to claim them and ask the user to log in.",
    declineReason: "Official CDC Vouchers are only claimed via the official RedeemSG website using Singpass, never through unofficial WhatsApp links.",
    declineReasonSimple: "Real vouchers from the government are never given through chat links.",
    openingMessages: [
      {
        id: "m1",
        direction: "inbound",
        body: "Good news! You are eligible for an extra $100 CDC Voucher. Claim your voucher here: cdc-claim-sg.com"
      }
    ]
  },
  {
    id: 8,
    isScam: true,
    contact: { displayName: "DBS Security", phoneNumber: "+65 8000 1234" },
    scenarioBrief: "You impersonate a bank. Tell the user their account has a suspicious login and they must click a link to secure it.",
    declineReason: "Banks in Singapore no longer send SMS or WhatsApp messages containing clickable links. Always use the official banking app.",
    declineReasonSimple: "Banks will never send you links to fix your account.",
    openingMessages: [
      {
        id: "m1",
        direction: "inbound",
        body: "DBS Alert: A suspicious login was detected on your account. Please secure your funds immediately at: secure-dbs-update.com"
      }
    ]
  },
  {
    id: 9,
    isScam: false,
    contact: { displayName: "Mr. Tan (Math Tutor)", phoneNumber: "+65 9222 3344" },
    scenarioBrief: "You are the user's tutor. Remind them about the upcoming lesson and to bring their completed worksheet.",
    declineReason: "This is a standard reminder from a known contact without any suspicious links or requests for personal data.",
    declineReasonSimple: "This is a normal message from your tutor. There aren't any red flags like suspicious links.",
    openingMessages: [
      {
        id: "m1",
        direction: "inbound",
        body: "Hi {{name}}, just reminding you about our math tuition tomorrow at 4 PM. Don't forget to complete your homework!"
      }
    ]
  },
  {
    id: 10,
    isScam: true,
    contact: { displayName: "WhatsApp Support", phoneNumber: "+1 555 0192" },
    scenarioBrief: "You pretend to be official WhatsApp support. Threaten to ban the user's account unless they provide their ID details.",
    declineReason: "WhatsApp support will never ask for your personal information such as your ID. Sharing it will allow scammers to maliciously impersonate you.",
    declineReasonSimple: "Never share your personal info like your ID. If you do, a scammer can impersonate you.",
    openingMessages: [
      {
        id: "m1",
        direction: "inbound",
        body: "WhatsApp Security: Your account has been reported. Please reply with details your ID for verification purposes."
      }
    ]
  },
  {
    id: 11,
    isScam: true,
    contact: { displayName: "Singtel Billing", phoneNumber: "+65 8555 4444" },
    scenarioBrief: "You impersonate a telecom company. Claim a bill is overdue and service will be cut off unless paid immediately via PayNow to the provided phone number.",
    declineReason: "Telecom providers do not demand immediate payment via a suspicious PayNow number. Always check your bills through the official telco app.",
    declineReasonSimple: "Phone companies do not ask you to pay bills using a suspicious PayNow number.",
    openingMessages: [
      {
        id: "m1",
        direction: "inbound",
        body: "Singtel: Your monthly bill is overdue. To avoid service suspension today, please pay $45.50 immediately via PayNow to +65 8555 4444"
      }
    ]
  },
  {
    id: 12,
    isScam: true,
    contact: { displayName: "Netflix Support", phoneNumber: "+65 8333 1111" },
    scenarioBrief: "You impersonate Netflix. Claim the user's payment failed and they need to update their credit card details via a link.",
    declineReason: "Streaming services send official emails, not WhatsApp messages from unknown numbers, if there is a payment issue.",
    declineReasonSimple: "TV apps send emails, not chat messages, if there is a problem with paying.",
    openingMessages: [
      {
        id: "m1",
        direction: "inbound",
        body: "Netflix: Your last subscription payment declined. Your account will be locked in 24 hours. Update your card here: netflix-billing-update.com"
      }
    ]
  },
  {
    id: 13,
    isScam: false,
    contact: { displayName: "Chloe (Work Colleague)", phoneNumber: "+65 9777 6655" },
    scenarioBrief: "You are a colleague asking to push back a meeting by 15 minutes. Stay Professional and casual.",
    declineReason: "A normal work-related question from a known contact without any financial requests or suspicious links.",
    declineReasonSimple: "This is a safe message from someone at work asking to reschedule a meeting.",
    openingMessages: [
      {
        id: "m1",
        direction: "inbound",
        body: "Hey, my previous meeting is running late. Can we push our 2 PM meeting to 2:15 PM?"
      }
    ]
  },
  {
    id: 14,
    isScam: true,
    contact: { displayName: "Shopee HR", phoneNumber: "+65 8111 2222" },
    scenarioBrief: "You are a fake recruiter. Offer the user an easy part-time job clicking items to boost sales, promising high daily pay.",
    declineReason: "E-commerce platforms do not hire via WhatsApp for 'boosting tasks' that eventually require you to transfer your own money.",
    declineReasonSimple: "Real shopping apps do not offer jobs on chat where you have to pay money first.",
    openingMessages: [
      {
        id: "m1",
        direction: "inbound",
        body: "Hello! We are hiring part-time staff for Shopee. Earn $100 - $300 a day just by clicking and reviewing products. Can I share more details?"
      }
    ]
  },
  {
    id: 15,
    isScam: true,
    contact: { displayName: "ICA Notification", phoneNumber: "+65 9444 3333" },
    scenarioBrief: "You impersonate the immigration authority. Claim the user's passport is expiring and provide a link to pay the renewal fee.",
    declineReason: "The Immigration & Checkpoints Authority (ICA) does not send links via WhatsApp for passport renewals or fee collections.",
    declineReasonSimple: "The government does not send links on chat to fix your passport.",
    openingMessages: [
      {
        id: "m1",
        direction: "inbound",
        body: "ICA Alert: Your passport is expiring soon. To avoid penalties, please complete your renewal application and pay the fee here: ica-renew-sg.com"
      }
    ]
  },
  {
    id: 16,
    isScam: true,
    contact: { displayName: "Crypto Master James", phoneNumber: "+44 7911 123456" },
    scenarioBrief: "You are a scammer pushing fake cryptocurrency investments. Promise guaranteed daily returns with no risk.",
    declineReason: "Promises of high, guaranteed returns with zero risk are classic investment scams. Legitimate firms do not cold-message on WhatsApp.",
    declineReasonSimple: "Strangers offering free money or fast cash on chat are trying to trick you.",
    openingMessages: [
      {
        id: "m1",
        direction: "inbound",
        body: "Hi friend, I am managing a private crypto pool that guarantees 15% profit every day with zero risk. Would you like to start with just $50?"
      }
    ]
  },
  {
    id: 17,
    isScam: true,
    contact: { displayName: "Dr. Alex (UK)", phoneNumber: "+44 7700 900077" },
    scenarioBrief: "You are a romance scammer. Pretend you just found the user's number by mistake, then try to strike up a friendly conversation to build trust and ask for money.",
    declineReason: "Romance scammers build trust over time, often claiming to be professionals overseas, before eventually asking for money for emergencies.",
    declineReasonSimple: "Strangers from far away who try to be your friend on chat usually want your money later.",
    openingMessages: [
      {
        id: "m1",
        direction: "inbound",
        body: "Hi Jenny, this is Dr. Alex. Are we still meeting for coffee later? ... Oh, I'm sorry, I think I typed the wrong number. You have a very nice profile picture though, where are you from?"
      }
    ]
  },
  {
    id: 18,
    isScam: false,
    contact: { displayName: "GrabFood Rider", phoneNumber: "+65 8222 9999" },
    scenarioBrief: "You are a food delivery rider. Ask the user for directions because you are lost in their housing estate.",
    declineReason: "Delivery drivers commonly use WhatsApp or calls to clarify addresses when they are nearby. This contains no malicious links.",
    declineReasonSimple: "It is normal for a delivery driver to ask for directions if they are lost.",
    openingMessages: [
      {
        id: "m1",
        direction: "inbound",
        body: "Hi, GrabFood here. I am at your address but I cannot find your unit. Can you help guide me?"
      }
    ]
  },
  {
    id: 19,
    isScam: true,
    contact: { displayName: "Hope Foundation", phoneNumber: "+65 8777 1234" },
    scenarioBrief: "You are a scammer pretending to be a charity. Send a tragic story about a recent disaster and ask for donations via PayNow.",
    declineReason: "Scammers exploit tragedies by setting up fake charities. Always donate through recognized platforms like Giving.sg instead of unknown PayNow numbers.",
    declineReasonSimple: "Bad people pretend to be charities to steal money. Only give money on real websites.",
    openingMessages: [
      {
        id: "m1",
        direction: "inbound",
        body: "Help families affected by the recent floods. Every dollar counts. Please donate directly to our relief fund via PayNow to +65 8777 1234"
      }
    ]
  },
  {
    id: 20,
    isScam: false,
    contact: { displayName: "ActiveSG Gym Admin", phoneNumber: "+65 9333 4444" },
    scenarioBrief: "You are a gym administrator notifying the user that their scheduled yoga class has been cancelled due to instructor illness.",
    declineReason: "This is a routine administrative message regarding a schedule change, with no links, requests for money, or personal data grabs.",
    declineReasonSimple: "This is a normal message about a class time changing. It is safe.",
    openingMessages: [
      {
        id: "m1",
        direction: "inbound",
        body: "Hi {{name}}, please be informed that today's 6 PM Yoga class is cancelled as the instructor is unwell. Your credits have been refunded. Apologies for any inconvenience caused."
      }
    ]
  },
];

module.exports = { whatsappScenarios };
