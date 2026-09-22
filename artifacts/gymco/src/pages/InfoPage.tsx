import { useState } from "react";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowRight,
  Mail,
  Phone,
  MapPin,
  Building2,
  Briefcase,
  GraduationCap,
  Shield,
  LifeBuoy,
  ScrollText,
  Cookie,
  FileText,
  HelpCircle,
  Newspaper,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

type Section = { heading?: string; body: string | string[] };

type InfoContent = {
  slug: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  sections: Section[];
  showContactForm?: boolean;
  showFaq?: { q: string; a: string }[];
};

const CONTENT: Record<string, InfoContent> = {
  about: {
    slug: "about",
    eyebrow: "Who we are and what we do",
    title: "Welcome to Iconic Fitness",
    icon: Building2,
    subtitle:
      "At Iconic Fitness, we believe that fitness in terms of body and mind is the best path to a contented life. We advocate fitness for everyone and completely understand any time is right to begin the fitness journey.",
    sections: [
      {
        heading: "Our story",
        body: "Being in the industry for more than a decade, Iconic Fitness is committed to providing professional health and fitness services and a luxury experience to everyone at a pocket-friendly price. Each and everyone associated with us is a valuable asset and we always go an extra mile to safeguard their wellbeing. We strive to roll out more innovative and customized fitness programs to serve the community better and rightly cater to its dynamic needs.",
      },
      {
        heading: "What we offer",
        body: [
          "Classes — Age is just a number. We always have a fitness class suitable for your fitness needs. Explore our classes to find the right one.",
          "Instructors — Our professional trainers spend hours together to provide high-quality workout training and set new standards in the industry.",
          "Studio — Our gym floor features a wide range of world-class equipment including barbell set, pull-up frame & bar, fitness ball and much more.",
        ],
      },
      {
        heading: "By the numbers",
        body: "More than a decade in the industry · A team of seasoned, professional staff · A growing fit family across Bangalore.",
      },
      {
        heading: "The man behind the brand",
        body: [
          "“I wanted to give a concrete shape to my dream of sensitizing people on the need for adopting a fit lifestyle, and then Iconic Fitness was born.” — Mohammed Suhail, CEO",
          "As a fitness and bodybuilding enthusiast right from the outset, Mohammed Suhail, the CEO of Iconic Fitness, strongly believes that a healthy lifestyle can do wonders. He has curated workout regimens and customized diet plans for clients as a fitness coach. To him, it is more of a social responsibility to ensure the wellbeing of the community than just doing business. So, here he is with Iconic Fitness, already running a handful of centers and motivating thousands of people every day to transform for the greater good. Everything comes second to the contentment on the faces of the clients once they experience the change. That’s his biggest reward.",
        ],
      },
      {
        heading: "Visit us",
        body: "No. 43, 1st Block, Koramangala, Bangalore, Karnataka 560034 · Phone: 9480000248 / 9742900400 / 080 49546638 · Email: iconicfitnessindia@gmail.com",
      },
    ],
  },
  press: {
    slug: "press",
    eyebrow: "Press",
    title: "Iconic Fitness in the news",
    icon: Newspaper,
    subtitle:
      "Media kit, founder interviews and press inquiries — everything in one place.",
    sections: [
      {
        heading: "Recent coverage",
        body: [
          "YourStory · How Iconic Fitness is rewriting the gym membership in India",
          "Inc42 · 120 gyms, one pass: Bangalore's fitness experiment",
          "Economic Times · The rise of the all-access fitness membership",
        ],
      },
      {
        heading: "Press inquiries",
        body: "For interviews, quotes or media assets, write to iconicfitnessindia@gmail.com. We respond within one business day.",
      },
      {
        heading: "Brand assets",
        body: "Logo, screenshots and founder photos available on request.",
      },
    ],
  },
  careers: {
    slug: "careers",
    eyebrow: "Careers",
    title: "Build the future of fitness with us",
    icon: Briefcase,
    subtitle:
      "We're a small team in Bangalore obsessed with helping people move more.",
    sections: [
      {
        heading: "Open roles",
        body: [
          "Senior Product Designer — Bangalore (hybrid)",
          "Full-stack Engineer (React / Node) — Bangalore",
          "Partner Success Manager — Bangalore",
          "City Marketing Lead — Bangalore",
          "Customer Experience Associate — Bangalore",
        ],
      },
      {
        heading: "Why Iconic Fitness",
        body: "Elite membership for every employee · Annual learning budget · Health insurance for you and your family · Real ownership through ESOPs.",
      },
      {
        heading: "Apply",
        body: "Send your resume and a short note to iconicfitnessindia@gmail.com with the role in the subject line.",
      },
    ],
  },
  "become-a-trainer": {
    slug: "become-a-trainer",
    eyebrow: "For trainers",
    title: "Coach on Iconic Fitness",
    icon: GraduationCap,
    subtitle:
      "Get discovered by members across Bangalore who are looking for serious coaching.",
    sections: [
      {
        heading: "Who we work with",
        body: "Certified personal trainers, strength coaches, yoga instructors, pilates teachers, physios and nutritionists. We verify every trainer before listing.",
      },
      {
        heading: "What you get",
        body: [
          "A public profile with reviews and specialties.",
          "Bookings handled in-app — no chasing payments.",
          "70% trainer payout, paid weekly.",
          "Access to all partner gyms while coaching.",
        ],
      },
      {
        heading: "Apply",
        body: "Use the form below or email iconicfitnessindia@gmail.com with your certifications and a short bio.",
      },
    ],
    showContactForm: true,
  },
  corporate: {
    slug: "corporate",
    eyebrow: "Corporate plans",
    title: "Wellness benefits your team will actually use",
    icon: Sparkles,
    subtitle:
      "Give your employees access to 17 gyms in Bangalore — one bill, full visibility.",
    sections: [
      {
        heading: "Why companies choose Iconic Fitness",
        body: [
          "Up to 25% off retail pricing on bulk seats.",
          "Live engagement dashboard for HR.",
          "Onboarding sessions and wellness workshops.",
          "Add or remove employees in seconds.",
          "Family add-ons available.",
        ],
      },
      {
        heading: "How it works",
        body: "Tell us your team size, we send a tailored proposal within 24 hours. Pilot with 10 seats, scale when you're ready.",
      },
      {
        heading: "Request a proposal",
        body: "Fill the form below or email iconicfitnessindia@gmail.com.",
      },
    ],
    showContactForm: true,
  },
  help: {
    slug: "help",
    eyebrow: "Help center",
    title: "How can we help?",
    icon: LifeBuoy,
    subtitle:
      "Most questions answered in under a minute. Can't find what you need? Talk to us.",
    sections: [],
    showFaq: [
      {
        q: "Can I freeze my membership?",
        a: "Yes — pause for up to 30 days per year from Profile → Membership.",
      },
      {
        q: "Do I need to book in advance?",
        a: "Gym access is included with your pass — just show your membership. Group classes and trainer sessions need to be booked in the app.",
      },
      {
        q: "What if a gym is full?",
        a: "Open another nearby gym in the app — your pass works at all 17 partner gyms in Bangalore.",
      },
      {
        q: "Can I bring a guest?",
        a: "Elite members get 2 guest passes per month. Upgrade in Profile → Membership.",
      },
    ],
  },
  contact: {
    slug: "contact",
    eyebrow: "Contact",
    title: "Talk to a human",
    icon: Mail,
    subtitle:
      "We reply to every message within one business day — usually faster.",
    sections: [
      {
        heading: "Reach us directly",
        body: ["iconicfitnessindia@gmail.com"],
      },
      {
        heading: "Phone",
        body: "070262 76888 · 070263 22322 · Mon–Sat, 9 AM – 9 PM IST",
      },
      {
        heading: "Office",
        body: "Iconic Fitness India Pvt. Ltd., Flat No. 43, Koramangala 1st Block, Bengaluru, Karnataka",
      },
    ],
    showContactForm: true,
  },
  faqs: {
    slug: "faqs",
    eyebrow: "FAQs",
    title: "Frequently asked questions",
    icon: HelpCircle,
    subtitle: "Everything you need to know about Iconic Fitness.",
    sections: [],
    showFaq: [
      {
        q: "What is Iconic Fitness?",
        a: "Iconic Fitness is one of Bengaluru's leading fitness chains offering top-class gym facilities, personal training, group classes, and diet consultations. Our goal is to help you transform your fitness journey safely and effectively.",
      },
      {
        q: "Where are your branches located?",
        a: "We have multiple branches across Bengaluru: Koramangala (1st, ST Bed, 5th, 7th Block), BTM Layout & Thavarekere, Maruti Nagar, HSR Layout (Sector 2 & 7), Indiranagar 80 Feet Road, JP Nagar (7th Phase & Puttanahalli), Bellandur (Green Glan Layout & next to Centro Mall), Marathahalli, Brookfield, and Whitefield – Seegehalli. All memberships provide access to every Iconic Fitness location.",
      },
      {
        q: "What are your operating hours?",
        a: "Clubs are open 5:00 AM – 11:00 PM, 365 days a year (may vary by location; some branches open till 12:00 AM).",
      },
      {
        q: "Can I access all branches?",
        a: "Yes, with an All Club Access membership you can use all participating branches.",
      },
      {
        q: "What membership plans do you offer?",
        a: "1 Month – ₹3,540 (incl. taxes), 3 Months – ₹7,260 (incl. taxes), 6 Months – ₹8,999 (incl. taxes), 12 Months – ₹17,999 (incl. taxes). Limited-time offer: 15 months for ₹9,999 + taxes (limited slots only).",
      },
      {
        q: "What's included in the membership?",
        a: "Unlimited gym access, group classes (Zumba, HIIT, Yoga, Aerobics and more), locker & shower facilities, access to all branches, and a diet consultation with our in-house dietician.",
      },
      {
        q: "Are personal trainers available?",
        a: "Yes. Certified personal trainers are available at all branches. Personal training sessions are charged separately.",
      },
      {
        q: "What are your group class timings?",
        a: "Morning: 7:00 AM – 8:00 AM and Evening: 7:00 PM – 8:00 PM, Monday to Saturday. Beginner-friendly classes with trial sessions available.",
      },
      {
        q: "Do you have a dietician?",
        a: "Yes, we have an in-house dietician who provides customized meal plans for weight loss, muscle gain, and fitness goals.",
      },
      {
        q: "Are group classes included?",
        a: "Yes, if included in your plan. Class availability and timings may vary.",
      },
      {
        q: "Can I pause my membership?",
        a: "Yes, but only as per your plan terms and subject to management approval.",
      },
      {
        q: "Are facilities like steam and showers available?",
        a: "Available at selected branches only. Please check with your location.",
      },
      {
        q: "Can I transfer my membership?",
        a: "Yes, subject to these conditions: the membership can be transferred only to a non-member of Iconic Fitness (existing members are not eligible); only the gym membership can be transferred — Personal Training packages, diet plans, promotional benefits, add-on services, merchandise or other packages are not transferable; a minimum of 60 days of active membership validity must be remaining at the time of the transfer request; the applicable membership transfer fee must be paid; and all transfers are subject to management approval and verification.",
      },
      {
        q: "What should I bring to the gym?",
        a: "Bring your app/QR code, workout attire, clean shoes, and a water bottle.",
      },
      {
        q: "How do I contact support?",
        a: "Contact your branch directly or use the support option in the Iconic Fitness App.",
      },
    ],
  },
  safety: {
    slug: "safety",
    eyebrow: "Safety",
    title: "Safety guidelines",
    icon: Shield,
    subtitle: "Train hard. Train safe.",
    sections: [
      {
        heading: "Before you train",
        body: [
          "Warm up for at least 5 minutes before any heavy lifting.",
          "Hydrate — bring a bottle and refill as needed.",
          "If it's your first time at a facility, ask staff for a quick orientation.",
        ],
      },
      {
        heading: "At the gym",
        body: [
          "Wipe down equipment after every set.",
          "Wear proper closed-toe shoes in the weights area.",
          "Use collars on barbells. Re-rack everything.",
          "Don't lift heavy without a spotter or safety pins.",
        ],
      },
      {
        heading: "Medical conditions",
        body: "Members with heart conditions, joint injuries or pregnancy should consult a doctor before starting any new program and inform the gym staff on arrival.",
      },
      {
        heading: "Reporting incidents",
        body: "If you witness or are involved in any incident, notify the gym immediately and email iconicfitnessindia@gmail.com. We take every report seriously.",
      },
    ],
  },
  refund: {
    slug: "refund",
    eyebrow: "Policy",
    title: "Refund policy",
    icon: ScrollText,
    subtitle: "Last updated · May 2026",
    sections: [
      {
        heading: "No Refund Policy",
        body: "All payments made for memberships, Personal Training, diet plans, merchandise, registration fees, transfer fees, or any other services at Iconic Fitness are strictly non-refundable. Once payment is completed, no refunds (full or partial) will be issued under any circumstances, including but not limited to: change of mind, relocation or travel, medical reasons, non-usage of services, schedule changes, personal reasons, or membership cancellation by the member. By completing payment, the member confirms that they have read, understood, and accepted the Terms & Conditions and this No Refund Policy.",
      },
      {
        heading: "Class & trainer credits",
        body: "Unused class and trainer credits expire at the end of your billing cycle and are not refundable in cash.",
      },
      {
        heading: "Billing disputes",
        body: "If you believe you've been charged incorrectly, contact our support team within 30 days of the charge — WhatsApp +91 94800 00248 or email iconicfitnessindia@gmail.com — and we'll investigate.",
      },
    ],
  },
  privacy: {
    slug: "privacy",
    eyebrow: "Legal",
    title: "Privacy policy",
    icon: Shield,
    subtitle: "Last updated · August 2026",
    sections: [
      {
        heading: "Who we are",
        body: "Iconic Fitness India Pvt. Ltd. ('Iconic Fitness', 'we', 'us', 'our') operates the Iconic Fitness mobile app and website (iconicfitnessindia.com). This policy explains what personal data we collect, why we collect it, and how you can control it. By using our app or website you agree to the practices described here.",
      },
      {
        heading: "Data we collect",
        body: [
          "Account information — your name, email address, and mobile phone number when you register.",
          "Profile photos — photos you voluntarily upload for your member profile. These are stored on our servers and displayed to gym staff when you check in.",
          "Location — with your permission, we access device GPS to show nearby gyms and calculate distances. Location is used only while the app is open and is never recorded in the background.",
          "Payment information — billing details such as cardholder name and masked card/UPI identifiers when you purchase a membership or store product. Full card numbers are never stored by us; they are handled directly by our payment partners (Airpay and Razorpay) who are PCI-DSS compliant.",
          "Fitness and usage data — workouts you log, classes you book, gyms you visit, and in-app activity, used to personalise recommendations.",
          "Device and technical data — device model, operating system, app version, IP address, and crash reports, used for debugging and security.",
          "Communications — messages you send us via support chat, email, or our contact form.",
        ],
      },
      {
        heading: "How we use your data",
        body: [
          "Create and manage your membership account.",
          "Process payments through Airpay and Razorpay.",
          "Verify your identity at partner gym check-in points.",
          "Show your profile photo to gym staff during check-in.",
          "Display gyms near your current location (only with your explicit permission).",
          "Send transaction receipts, membership reminders, and service notifications via email, SMS, or push notification.",
          "Detect and prevent fraud and unauthorized access.",
          "Improve our app features and fix bugs using anonymized usage data.",
          "Respond to your support queries.",
        ],
      },
      {
        heading: "Payments — Airpay and Razorpay",
        body: "All payment transactions on Iconic Fitness are processed by Airpay (Ezeepay Finance Pvt. Ltd.) and Razorpay Software Pvt. Ltd. When you make a payment you are subject to their respective privacy policies in addition to ours. We receive a payment confirmation and a masked summary (last 4 digits, payment method type) but never the full card number, CVV, or bank credentials. Both processors are RBI-registered and PCI-DSS Level 1 certified.",
      },
      {
        heading: "Location data",
        body: "We request location access only to show gyms near you. You will be asked for permission before location is accessed. You can revoke location permission at any time in your device Settings. If you deny permission, the app works normally — you can still search gyms by city or name. We do not track your location in the background or share GPS co-ordinates with third parties.",
      },
      {
        heading: "Photos and images",
        body: "Profile photos you upload are stored on our servers and are visible to gym staff at partner locations to help with check-in. We do not share your photo with advertisers or use it for facial recognition. You can remove your photo at any time from Profile → Edit Profile. If you delete your account, your photo is permanently deleted within 30 days.",
      },
      {
        heading: "Who we share your data with",
        body: [
          "Partner gyms — your name, member ID, photo, and membership status when you check in at a facility.",
          "Airpay and Razorpay — payment data to process transactions.",
          "Cloud infrastructure providers — we use reputable cloud providers to host our servers; they act as data processors under our instructions.",
          "Legal and regulatory authorities — if required by law, court order, or to protect the rights and safety of our users.",
          "We do not sell, rent, or trade your personal data to advertisers or data brokers.",
        ],
      },
      {
        heading: "Data retention",
        body: "We retain your account data for as long as your account is active or as required by law. Transactional records (invoices, payment logs) are kept for 7 years as required under Indian accounting law. If you request deletion, non-financial personal data (name, email, phone, photo) is erased within 30 days.",
      },
      {
        heading: "Security",
        body: "We use industry-standard measures including HTTPS encryption, secure data storage, and access controls to protect your data. Passwords are never stored in plain text. However, no internet transmission is 100% secure — please use a strong, unique password and enable two-factor authentication if available.",
      },
      {
        heading: "Children's privacy",
        body: "Our services are not directed at children under 13. We do not knowingly collect data from children under 13. Members aged 13–17 require parental or guardian consent. If you believe we have inadvertently collected data from a child, contact us immediately and we will delete it.",
      },
      {
        heading: "Your rights",
        body: [
          "Access — request a copy of the personal data we hold about you.",
          "Correction — ask us to correct inaccurate information.",
          "Deletion — request permanent deletion of your account and personal data.",
          "Portability — receive your data in a structured, machine-readable format.",
          "Withdrawal of consent — revoke location or notification permissions at any time in your device Settings.",
          "To exercise any right, email iconicfitnessindia@gmail.com with the subject line 'Privacy Request'. We will respond within 30 days.",
        ],
      },
      {
        heading: "Data deletion requests",
        body: "To delete your account and all associated personal data, email iconicfitnessindia@gmail.com with the subject 'Delete My Account' from the email address linked to your account. Include your registered phone number for verification. We will confirm deletion within 30 days. Note that anonymized transaction records required by law are retained separately and cannot be deleted.",
      },
      {
        heading: "Changes to this policy",
        body: "We may update this policy from time to time. If we make material changes we will notify you via the app or by email at least 14 days before the change takes effect. Continued use of the service after the effective date constitutes acceptance of the updated policy.",
      },
      {
        heading: "Governing law",
        body: "This policy is governed by the laws of India. Any disputes arising from it are subject to the exclusive jurisdiction of the courts of Bengaluru, Karnataka.",
      },
      {
        heading: "Contact our Data Protection Officer",
        body: "Iconic Fitness India Pvt. Ltd. · Flat No. 43, Koramangala 1st Block, Bengaluru, Karnataka 560034 · Email: iconicfitnessindia@gmail.com · Phone: 070262 76888",
      },
    ],
  },
  terms: {
    slug: "terms",
    eyebrow: "Legal",
    title: "Terms of service",
    icon: FileText,
    subtitle: "Last updated · August 2026",
    sections: [
      {
        heading: "Acceptance",
        body: "By creating an Iconic Fitness account or using any Iconic Fitness facility, mobile application, or website (iconicfitnessindia.com), you ('Member', 'you') agree to these Terms of Service and all policies incorporated by reference, including our Privacy Policy, Refund Policy, and Cookie Policy. If you do not agree, please do not create an account or use the service. These terms constitute a legally binding agreement between you and Iconic Fitness India Pvt. Ltd. ('Iconic Fitness', 'we', 'us', 'our').",
      },
      {
        heading: "Eligibility",
        body: "You must be at least 16 years of age to create an account. Members aged 16–17 require written parental or guardian consent before purchasing a paid membership plan. Members under 13 are not permitted to use the service. By registering, you confirm that the information you provide is accurate and that you meet the age requirement.",
      },
      {
        heading: "Membership and subscriptions",
        body: [
          "Membership plans are valid for the duration stated at the time of purchase (e.g. 1 month, 3 months, 6 months, 12 months).",
          "Auto-renewal: Where a membership plan is set to renew automatically, your saved payment method will be charged at the then-current rate at the end of each billing period unless you cancel in advance. To cancel, contact us at iconicfitnessindia@gmail.com or WhatsApp +91 94800 00248 before your renewal date.",
          "Pricing: Membership fees may change with at least 30 days' advance notice sent to your registered email address. The new price takes effect from your next renewal.",
          "Plan benefits are subject to fair-use limits described in your chosen plan. Promotional offers cannot be combined unless Iconic Fitness expressly states otherwise.",
          "Facilities, amenities, class schedules, and operating hours vary by branch and may be updated by management without prior notice.",
          "Membership freezes, extensions, and special accommodations are subject to company policy and require management approval.",
        ],
      },
      {
        heading: "Membership transfer",
        body: "Membership is intended for personal, non-commercial use by the registered member only. A membership may be transferred to another individual subject to all of the following conditions: (a) the recipient must be a new, non-existing Iconic Fitness member — existing members are not eligible to receive transferred memberships; (b) only the base membership may be transferred — Personal Training packages, diet plans, promotional benefits, add-on services, merchandise, and any other purchased packages are non-transferable; (c) a minimum of 60 days of active membership validity must remain at the time the transfer request is submitted; (d) the applicable membership transfer fee must be paid in full; and (e) the transfer is subject to management approval and identity verification. Iconic Fitness reserves the right to decline any transfer request.",
      },
      {
        heading: "Conduct and club rules",
        body: [
          "Members must follow all gym rules, safety guidelines, and staff instructions at every Iconic Fitness facility.",
          "Respect for staff and fellow members is mandatory. Harassment, discriminatory behaviour, or intimidation of any kind will result in immediate suspension or termination of membership without refund.",
          "Lockers are provided for temporary use during workouts only. Iconic Fitness is not responsible for the loss, theft, or damage of personal belongings.",
          "Any damage to gym equipment or property caused by negligence or misuse may be charged to the responsible member.",
          "Members are responsible for returning all equipment to its designated place after use and for maintaining hygiene standards (e.g. wiping down equipment).",
          "Members should consult a qualified medical practitioner before commencing any fitness programme, particularly if they have a pre-existing medical condition.",
        ],
      },
      {
        heading: "Liability and assumption of risk",
        body: "Physical exercise and use of gym equipment carry inherent risks including, but not limited to, muscular strain, joint injuries, cardiovascular events, and in rare circumstances, permanent disability or death. By using Iconic Fitness facilities or the app, you voluntarily assume all such risks. To the fullest extent permitted by applicable law, Iconic Fitness, its directors, employees, trainers, and partner gyms are not liable for any injury, illness, loss, or damage sustained during the use of our facilities or services, except where such harm results from the proven gross negligence or wilful misconduct of Iconic Fitness.",
      },
      {
        heading: "Legal waiver, declaration, and indemnity",
        body: "By purchasing a membership and using any Iconic Fitness facility, you declare that: (a) you are physically and mentally fit to exercise and will consult a doctor before starting if you have any medical condition; (b) you understand the inherent risks of exercise, strength training, group classes, and gym equipment; (c) you participate voluntarily and at your own risk; (d) you agree to follow all safety instructions, gym rules, and trainer directions; and (e) to the fullest extent permitted by law, you release Iconic Fitness, its directors, shareholders, management, employees, trainers, agents, and affiliates from any claims arising from your use of the facilities, except where caused by Iconic Fitness's proven negligence or wilful misconduct. You further agree to indemnify and hold harmless Iconic Fitness from any third-party claims arising from your actions or violations of these terms. Payment and/or use of the Iconic Fitness app or facilities constitutes electronic acceptance of this agreement.",
      },
      {
        heading: "Intellectual property",
        body: "All content on the Iconic Fitness app and website — including text, graphics, logos, class videos, workout plans, and software — is the property of Iconic Fitness India Pvt. Ltd. or its licensors and is protected under applicable Indian copyright and intellectual property laws. You may not reproduce, distribute, modify, or create derivative works from any content without our prior written consent.",
      },
      {
        heading: "Account security",
        body: "You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. Notify us immediately at iconicfitnessindia@gmail.com if you suspect unauthorised access. We are not liable for loss resulting from unauthorised use of your account where you have not taken reasonable precautions.",
      },
      {
        heading: "Digital Personal Data Protection Act 2023 (India)",
        body: [
          "Iconic Fitness processes your personal data as a 'Data Fiduciary' under the Digital Personal Data Protection Act, 2023 ('DPDP Act'). We collect and process personal data only for lawful, specific, and stated purposes as described in our Privacy Policy.",
          "As a Data Principal (member), you have the right to: access a summary of your personal data processed by us; correct or update inaccurate personal data; request erasure of your personal data where it is no longer necessary for the stated purpose; nominate another individual to exercise your rights in the event of your death or incapacity; and withdraw consent for non-essential data processing at any time.",
          "We will respond to all DPDP rights requests within the timelines prescribed under the Act.",
          "We do not transfer your personal data outside India except where required to fulfil a service (e.g. payment processing by RBI-regulated processors) and in compliance with applicable cross-border transfer requirements under the DPDP Act.",
        ],
      },
      {
        heading: "Grievance officer",
        body: "In accordance with the Information Technology Act, 2000, the Consumer Protection Act, 2019, and the Digital Personal Data Protection Act, 2023, the details of our Grievance Officer are as follows — Name: Mohammed Suhail (CEO, Iconic Fitness India Pvt. Ltd.) · Address: Flat No. 43, Koramangala 1st Block, Bengaluru, Karnataka 560034 · Email: iconicfitnessindia@gmail.com · Phone: 070262 76888 · Working hours: Monday to Saturday, 9:00 AM – 6:00 PM IST. Any grievance or complaint regarding the service, data processing, or breach of these terms must be submitted in writing to the Grievance Officer. We will acknowledge receipt within 48 hours and resolve the grievance within 30 days of receipt.",
      },
      {
        heading: "Changes to these terms",
        body: "We may update these Terms of Service from time to time. If we make material changes, we will notify you via the app or by email at least 14 days before the changes take effect. Your continued use of the service after the effective date constitutes acceptance of the updated terms. If you do not agree to the revised terms, you must stop using the service before the effective date.",
      },
      {
        heading: "Governing law",
        body: "These Terms of Service are governed by and construed in accordance with the laws of India, including the Information Technology Act 2000, the Consumer Protection Act 2019, and the Digital Personal Data Protection Act 2023. Any dispute arising out of or in connection with these terms shall be subject to the exclusive jurisdiction of the competent courts in Bengaluru, Karnataka, India.",
      },
      {
        heading: "Contact",
        body: "Iconic Fitness India Pvt. Ltd. · Flat No. 43, Koramangala 1st Block, Bengaluru, Karnataka 560034 · Email: iconicfitnessindia@gmail.com · Phone: 070262 76888 · Mon–Sat, 9 AM – 6 PM IST",
      },
    ],
  },
  cookies: {
    slug: "cookies",
    eyebrow: "Legal",
    title: "Cookie policy",
    icon: Cookie,
    subtitle: "Last updated · August 2026",
    sections: [
      {
        heading: "What are cookies",
        body: "Cookies are small text files that a website stores on your device when you visit or sign in. They allow the service to remember your login state and preferences so you do not have to re-enter information on each visit. Similar technologies — such as device-local storage used by our mobile app — serve the same purpose and are covered by this policy.",
      },
      {
        heading: "How we use cookies",
        body: [
          "To keep you signed in securely during your session and across return visits.",
          "To protect our service against cross-site request forgery (CSRF) and other security threats.",
          "To remember your preferences such as your selected city and display settings.",
          "To maintain session continuity during payment checkout with our payment processors.",
        ],
      },
      {
        heading: "Cookies and local storage we use",
        body: [
          "COOKIES — small files stored in your browser.",
          "  · sidebar_state | Purpose: Remembers whether the admin sidebar is open or collapsed | Duration: 7 days | Set by: Iconic Fitness (website UI)",
          "  · gymco.admin.sid | Purpose: Maintains your staff or admin login session (HTTP-only, not readable by scripts) | Duration: 7 days or until sign-out | Set by: Iconic Fitness server",
          "  · clerk_* (e.g. __session, __client_uat) | Purpose: Manages member authentication state and token refresh | Duration: Session to 30 days | Set by: Clerk Inc. (our authentication provider)",
          "LOCAL STORAGE — browser storage that persists until cleared (not transmitted with requests).",
          "  · iconic-theme | Purpose: Stores your light/dark mode preference | Set by: Iconic Fitness website",
          "  · iconic.cart.v1 | Purpose: Saves items in your store cart between visits | Set by: Iconic Fitness website",
          "SESSION STORAGE — temporary browser storage cleared when the tab is closed.",
          "  · iconic.embed | Purpose: Flags when the site is embedded in a partner iframe so the layout adjusts correctly | Set by: Iconic Fitness website",
        ],
      },
      {
        heading: "Third-party cookies",
        body: "The clerk_* cookies listed above are set by Clerk Inc., our member authentication provider, under their own privacy policy (clerk.com/privacy). When you make a purchase, you are redirected to a hosted checkout page operated by Airpay (Ezeepay Finance Pvt. Ltd.) or Razorpay Software Pvt. Ltd. Those pages may set their own cookies and local storage entries. We do not control or have visibility into what those processors store; please refer to their respective cookie and privacy policies: Razorpay — razorpay.com/privacy; Airpay / Ezeepay — ezeepay.in. We do not currently use advertising or analytics tracking cookies on our own pages.",
      },
      {
        heading: "Cookies and the mobile app",
        body: "The Iconic Fitness mobile app does not use browser cookies. Member authentication tokens are managed by Clerk's native token cache (which uses the device's secure storage on iOS and Android). Separately, the app uses AsyncStorage for local query caching and non-sensitive preferences such as dismissed prompts. This data stays on your device; authentication tokens are cleared when you sign out, and cached preferences are cleared when you uninstall the app.",
      },
      {
        heading: "Managing cookies",
        body: [
          "Because we use only functional cookies and local storage (no advertising or analytics tracking cookies), there is no opt-in banner required for core site functionality.",
          "Browser settings — you can clear or block cookies and local storage at any time through your browser. Chrome: Settings → Privacy and Security → Cookies; Firefox: Settings → Privacy & Security; Safari: Preferences → Privacy; Edge: Settings → Cookies and site permissions.",
          "Effect of disabling cookies — blocking the gymco.admin.sid or clerk_* cookies will prevent staff or member sign-in respectively. Clearing local storage will reset your theme preference and empty your cart. None of these affect your membership account data, which is stored on our servers.",
        ],
      },
      {
        heading: "Data retention and DPDP Act",
        body: "Cookie data that constitutes personal data under the Digital Personal Data Protection Act, 2023 ('DPDP Act') is handled in accordance with our Privacy Policy. Preference data is retained for the durations shown in the table above. You may request deletion of personal data linked to your account by emailing iconicfitnessindia@gmail.com with the subject line 'Privacy Request'.",
      },
      {
        heading: "Changes to this policy",
        body: "We may update this Cookie Policy to reflect changes in our practices or applicable law. If we introduce new categories of cookies (for example analytics or marketing cookies), we will update this policy and notify you via the app or by email at least 14 days in advance. Continued use of the service after the effective date constitutes acceptance of the updated policy.",
      },
      {
        heading: "Contact",
        body: "For any questions about our use of cookies, contact our Data Protection Officer — Iconic Fitness India Pvt. Ltd. · Flat No. 43, Koramangala 1st Block, Bengaluru, Karnataka 560034 · Email: iconicfitnessindia@gmail.com · Phone: 070262 76888",
      },
    ],
  },
};

function ContactForm({ topic }: { topic: string }) {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (form.name.trim().length < 2 || !form.email.trim() || !form.message.trim() || !/^[+0-9 ()-]{7,}$/.test(form.phone.trim())) {
      toast({
        title: "Add a few more details",
        description: "Enter your full name, email, valid phone number and message.",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          kind: "general",
          name: form.name,
          email: form.email,
          phone: form.phone.trim(),
          message: `[${topic}] ${form.message}`,
          source: `info:${topic}`,
        }),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.error || "Could not save your message. Please try again.");
      }
      setDone(true);
    } catch (error) {
      toast({
        title: "Couldn't send",
        description: error instanceof Error ? error.message : "Please try again or email iconicfitnessindia@gmail.com.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <Card className="p-8 text-center border-emerald-500/30 bg-emerald-500/5">
        <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto mb-3" />
        <h3 className="text-xl font-black tracking-tight">
          Thanks — message received.
        </h3>
        <p className="text-muted-foreground mt-1 text-sm">
          Our team will get back to you within one business day.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-6 md:p-8 border-border/60">
      <h3 className="text-xl md:text-2xl font-black tracking-tight">
        Send us a note
      </h3>
      <p className="text-sm text-muted-foreground mt-1">
        We respond within one business day.
      </p>
      <form onSubmit={submit} className="mt-5 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input
            placeholder="Your name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="h-11"
          />
          <Input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="h-11"
          />
        </div>
        <Input
          placeholder="Phone (required)"
          type="tel"
          required
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          className="h-11"
        />
        <Textarea
          placeholder="How can we help?"
          rows={5}
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
        />
        <Button
          type="submit"
          disabled={submitting}
          className="w-full md:w-auto bg-gradient-brand text-white border-none font-black tracking-wider h-11 px-6"
        >
          {submitting ? "SENDING..." : "SEND MESSAGE"}{" "}
          <ArrowRight className="h-4 w-4 ml-1.5" />
        </Button>
      </form>
    </Card>
  );
}

export default function InfoPage({ slug }: { slug: string }) {
  const content = CONTENT[slug];

  if (!content) {
    return (
      <div className="py-20 text-center">
        <h1 className="text-3xl font-black">Page not found</h1>
        <Link
          href="/"
          className="inline-flex items-center gap-1 mt-4 text-lime-600 font-bold"
        >
          Back home <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  const Icon = content.icon;

  return (
    <>
      <div className="max-w-4xl mx-auto py-6 md:py-10">
        <div className="mb-10 md:mb-14">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-lime-500/10 border border-lime-500/30 text-[10.5px] font-black tracking-[0.22em] text-lime-600 uppercase mb-5">
            <Icon className="h-3.5 w-3.5" /> {content.eyebrow}
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-[-0.03em] leading-[1.05]">
            {content.title}
          </h1>
          <p className="text-base md:text-lg text-muted-foreground mt-4 max-w-2xl">
            {content.subtitle}
          </p>
        </div>

        <div className="space-y-8 md:space-y-10">
          {content.sections.map((s, i) => (
            <section key={i}>
              {s.heading && (
                <h2 className="text-xl md:text-2xl font-black tracking-tight mb-3">
                  {s.heading}
                </h2>
              )}
              {Array.isArray(s.body) ? (
                <ul className="space-y-2">
                  {s.body.map((line, k) => (
                    <li
                      key={k}
                      className="flex gap-3 text-muted-foreground leading-relaxed"
                    >
                      <span className="mt-2.5 h-1.5 w-1.5 rounded-full bg-lime-500 shrink-0" />
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground leading-relaxed text-[15px]">
                  {s.body}
                </p>
              )}
            </section>
          ))}
        </div>

        {content.showFaq && (
          <div className="mt-10 space-y-3">
            {content.showFaq.map((f, i) => (
              <Card
                key={i}
                className="p-5 md:p-6 border-border/60 hover:border-lime-500/40 transition-colors"
              >
                <h3 className="font-black tracking-tight text-base md:text-lg">
                  {f.q}
                </h3>
                <p className="text-muted-foreground mt-1.5 text-sm md:text-[15px] leading-relaxed">
                  {f.a}
                </p>
              </Card>
            ))}
          </div>
        )}

        {content.showContactForm && (
          <div className="mt-12">
            <ContactForm topic={content.title} />
          </div>
        )}

        {/* Quick contact strip */}
        <Card className="mt-12 p-6 md:p-8 bg-gradient-to-br from-lime-500/8 via-card to-card border-lime-500/30">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            <a
              href="mailto:iconicfitnessindia@gmail.com"
              className="flex items-start gap-3 group"
            >
              <div className="h-10 w-10 rounded-xl bg-lime-500/10 text-lime-600 flex items-center justify-center shrink-0">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                  Email
                </div>
                <div className="font-bold group-hover:text-lime-600 transition-colors break-all">
                  iconicfitnessindia@gmail.com
                </div>
              </div>
            </a>
            <a
              href="tel:07026276888"
              className="flex items-start gap-3 group"
            >
              <div className="h-10 w-10 rounded-xl bg-lime-500/10 text-lime-600 flex items-center justify-center shrink-0">
                <Phone className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                  Phone
                </div>
                <div className="font-bold group-hover:text-lime-600 transition-colors">
                  070262 76888 · 070263 22322
                </div>
              </div>
            </a>
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-lime-500/10 text-lime-600 flex items-center justify-center shrink-0">
                <MapPin className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                  Office
                </div>
                <div className="font-bold">Koramangala 1st Block, Bengaluru</div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
