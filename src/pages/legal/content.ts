import { BUSINESS } from "@/lib/business";

export type LegalBlock = { h: string; p?: string[]; list?: string[] };
export type LegalDoc = { title: string; summary: string; sections: LegalBlock[] };
export type LegalId = "privacy" | "terms" | "refund" | "cookies" | "deletion" | "licences";

const B = BUSINESS;
const contactEn = `Email ${B.email}. We reply within 7 days and finish requests within 30 days.`;
const contactBn = `ইমেইল করুন ${B.email} ঠিকানায়। আমরা ৭ দিনের মধ্যে উত্তর দিই এবং ৩০ দিনের মধ্যে অনুরোধ সম্পন্ন করি।`;

export const LEGAL: Record<LegalId, { en: LegalDoc; bn: LegalDoc }> = {
  privacy: {
    en: {
      title: "Privacy Policy",
      summary: "What we collect, why, who can see it, how long we keep it, and how to delete it.",
      sections: [
        { h: "Who we are", p: [`${B.name} runs the Cholo Kheli app and website, where young athletes in Bangladesh share highlight clips with verified scouts. ${B.registration} Contact: ${B.email}, ${B.city}.`] },
        { h: "What we collect", list: [
          "Account: name, username, email, password (stored only as a secure hash), date of birth, gender, phone number, sport and whether you are a player or a scout.",
          "Players under 18: a parent or guardian's name, email and their consent.",
          "Scouts: organisation, and the ID and CV you upload so an admin can verify you.",
          "What you post: profile photo, bio, achievements, highlight videos with their titles, tags and length, comments, likes, follows and reports.",
          "Messages: scout and player conversations, which open only after an admin approves them. Admins can read them to keep players safe.",
          "Activity: which highlights are watched and for how long, to rank the feed; sign-in sessions and devices, shown to you under Settings.",
          "Push notification tokens if you allow notifications.",
          "Payments, if upload fees are switched on: amount, bKash payment ID, invoice number and the bKash account used. We never see your bKash PIN.",
        ] },
        { h: "Why we use it", list: [
          "To run your account and show your profile and highlights to verified scouts.",
          "To keep the platform safe: verify scouts, review reports, enforce age rules and stop abuse.",
          "To send the notifications you choose, and service emails such as sign-in links.",
          "To process upload fees and issue invoices, when fees are on.",
          "We do not sell your data and we do not show advertising.",
        ] },
        { h: "Who can see your data", list: [
          "Your profile and highlights: verified scouts, admins and signed-in players. Set your account to private to hide them from everyone except admins.",
          "Your email, phone, date of birth and guardian details: only you and admins. Scouts see your age, not your contact details.",
          "Scout documents: only that scout and admins.",
          "Service providers who process data for us under contract: Supabase (database, sign-in and file storage, servers in Mumbai, India), Cloudflare and Lovable (website hosting), Google (only if you choose Google sign-in, and Firebase for push notifications), Resend (email delivery) and bKash (payments, when switched on).",
          "Authorities, only when Bangladeshi law requires it.",
        ] },
        { h: "Children", p: [
          "You must be at least 13 to use Cholo Kheli. Players aged 13 to 17 need a parent or guardian's consent when they sign up. Scouts must be 18 or older.",
          "Scouts cannot message a player directly. Every conversation needs admin approval, and admins can see it.",
          `A parent or guardian can ask us to see, correct or delete a child's data: ${B.email}.`,
        ] },
        { h: "How long we keep it", list: [
          "Your account and posts: until you delete them or your account.",
          "When you delete your account, we remove your profile, highlights, files and messages straight away. Copies in our backups expire within 30 days.",
          "Invoices and payment records: kept as long as tax law requires, even after account deletion.",
          "Reports and moderation decisions: up to 12 months, to handle repeat abuse.",
        ] },
        { h: "Your rights", list: [
          "See and correct your details under Settings, Personal details.",
          "Delete your account under Settings, Delete account, or by email if you can't sign in (see Delete your data).",
          "Turn off email and push notifications under Settings, Notifications, or with the unsubscribe link in any email.",
          `Ask for a copy of your data: ${contactEn}`,
        ] },
        { h: "Security", list: [
          "Access rules in the database decide who can read each record; the app can't bypass them.",
          "Admin accounts need two-step verification.",
          "Passwords are never stored in readable form. Files are private and opened through short-lived links.",
        ] },
        { h: "Changes and contact", p: [`We'll post changes here and tell you in the app before they take effect. Effective ${B.legalEffective}. Questions or complaints: ${contactEn}`] },
      ],
    },
    bn: {
      title: "গোপনীয়তা নীতি",
      summary: "আমরা কী তথ্য নিই, কেন নিই, কে দেখতে পারে, কতদিন রাখি এবং কীভাবে মুছবেন।",
      sections: [
        { h: "আমরা কারা", p: [`${B.name} চলো খেলি অ্যাপ ও ওয়েবসাইট চালায়, যেখানে বাংলাদেশের তরুণ খেলোয়াড়রা যাচাই করা স্কাউটদের কাছে হাইলাইট ভিডিও পাঠায়। কোম্পানি নিবন্ধনের কাজ চলছে। যোগাযোগ: ${B.email}, ঢাকা, বাংলাদেশ।`] },
        { h: "আমরা যা তথ্য নিই", list: [
          "অ্যাকাউন্ট: নাম, ইউজারনেম, ইমেইল, পাসওয়ার্ড (শুধু নিরাপদ হ্যাশ হিসেবে রাখা হয়), জন্মতারিখ, লিঙ্গ, ফোন নম্বর, খেলা এবং আপনি খেলোয়াড় না স্কাউট।",
          "১৮ বছরের কম বয়সী খেলোয়াড়: মা-বাবা বা অভিভাবকের নাম, ইমেইল ও সম্মতি।",
          "স্কাউট: প্রতিষ্ঠানের নাম, এবং যাচাইয়ের জন্য আপলোড করা আইডি ও সিভি।",
          "আপনার পোস্ট: প্রোফাইল ছবি, পরিচিতি, অর্জন, হাইলাইট ভিডিও ও তার শিরোনাম, ট্যাগ ও দৈর্ঘ্য, মন্তব্য, লাইক, ফলো ও রিপোর্ট।",
          "মেসেজ: স্কাউট ও খেলোয়াড়ের কথোপকথন, যা অ্যাডমিন অনুমোদন দিলে খোলে। খেলোয়াড়দের নিরাপত্তার জন্য অ্যাডমিনরা এগুলো দেখতে পারেন।",
          "কার্যকলাপ: কোন হাইলাইট কতক্ষণ দেখা হয়েছে (ফিড সাজাতে), সাইন-ইন সেশন ও ডিভাইস (সেটিংসে দেখা যায়)।",
          "নোটিফিকেশন চালু করলে পুশ টোকেন।",
          "আপলোড ফি চালু থাকলে পেমেন্ট: টাকার পরিমাণ, bKash পেমেন্ট আইডি, ইনভয়েস নম্বর ও bKash অ্যাকাউন্ট। আপনার bKash পিন আমরা কখনো দেখি না।",
        ] },
        { h: "কেন ব্যবহার করি", list: [
          "আপনার অ্যাকাউন্ট চালাতে এবং যাচাই করা স্কাউটদের আপনার প্রোফাইল ও হাইলাইট দেখাতে।",
          "প্ল্যাটফর্ম নিরাপদ রাখতে: স্কাউট যাচাই, রিপোর্ট দেখা, বয়সের নিয়ম মানা ও অপব্যবহার বন্ধ করা।",
          "আপনার বেছে নেওয়া নোটিফিকেশন ও সাইন-ইন লিংকের মতো প্রয়োজনীয় ইমেইল পাঠাতে।",
          "ফি চালু থাকলে আপলোড ফি নেওয়া ও ইনভয়েস দিতে।",
          "আমরা আপনার তথ্য বিক্রি করি না এবং কোনো বিজ্ঞাপন দেখাই না।",
        ] },
        { h: "কে আপনার তথ্য দেখতে পারে", list: [
          "প্রোফাইল ও হাইলাইট: যাচাই করা স্কাউট, অ্যাডমিন ও সাইন-ইন করা খেলোয়াড়। অ্যাকাউন্ট প্রাইভেট করলে অ্যাডমিন ছাড়া কেউ দেখবে না।",
          "ইমেইল, ফোন, জন্মতারিখ ও অভিভাবকের তথ্য: শুধু আপনি ও অ্যাডমিন। স্কাউটরা আপনার বয়স দেখেন, যোগাযোগের তথ্য নয়।",
          "স্কাউটের কাগজপত্র: শুধু সেই স্কাউট ও অ্যাডমিন।",
          "চুক্তির অধীনে আমাদের হয়ে কাজ করা সেবাদাতা: Supabase (ডেটাবেস, সাইন-ইন ও ফাইল, সার্ভার ভারতের মুম্বাইয়ে), Cloudflare ও Lovable (ওয়েবসাইট হোস্টিং), Google (শুধু Google দিয়ে সাইন ইন করলে, এবং পুশ নোটিফিকেশনের জন্য Firebase), Resend (ইমেইল পাঠানো) এবং bKash (পেমেন্ট চালু হলে)।",
          "বাংলাদেশের আইন অনুযায়ী প্রয়োজন হলে কর্তৃপক্ষ।",
        ] },
        { h: "শিশু ও কিশোর", p: [
          "চলো খেলি ব্যবহার করতে বয়স কমপক্ষে ১৩ হতে হবে। ১৩ থেকে ১৭ বছরের খেলোয়াড়দের সাইন আপের সময় মা-বাবা বা অভিভাবকের সম্মতি লাগে। স্কাউটদের বয়স ১৮ বা তার বেশি হতে হবে।",
          "স্কাউটরা সরাসরি খেলোয়াড়কে মেসেজ করতে পারেন না। প্রতিটি কথোপকথনে অ্যাডমিনের অনুমোদন লাগে এবং অ্যাডমিন তা দেখতে পারেন।",
          `মা-বাবা বা অভিভাবক সন্তানের তথ্য দেখতে, ঠিক করতে বা মুছতে বলতে পারেন: ${B.email}।`,
        ] },
        { h: "কতদিন রাখি", list: [
          "অ্যাকাউন্ট ও পোস্ট: আপনি মুছে না ফেলা পর্যন্ত।",
          "অ্যাকাউন্ট মুছলে প্রোফাইল, হাইলাইট, ফাইল ও মেসেজ সঙ্গে সঙ্গে মুছে যায়। ব্যাকআপের কপি ৩০ দিনের মধ্যে মুছে যায়।",
          "ইনভয়েস ও পেমেন্টের রেকর্ড: কর আইনে যতদিন রাখা দরকার, অ্যাকাউন্ট মুছলেও।",
          "রিপোর্ট ও মডারেশনের সিদ্ধান্ত: বারবার অপব্যবহার ঠেকাতে সর্বোচ্চ ১২ মাস।",
        ] },
        { h: "আপনার অধিকার", list: [
          "সেটিংস, ব্যক্তিগত তথ্য থেকে আপনার তথ্য দেখুন ও ঠিক করুন।",
          "সেটিংস, অ্যাকাউন্ট মুছুন থেকে অ্যাকাউন্ট মুছুন, অথবা সাইন ইন করতে না পারলে ইমেইল করুন (তথ্য মুছুন পাতা দেখুন)।",
          "সেটিংস, নোটিফিকেশন থেকে বা যেকোনো ইমেইলের আনসাবস্ক্রাইব লিংক দিয়ে ইমেইল ও পুশ নোটিফিকেশন বন্ধ করুন।",
          `আপনার তথ্যের কপি চাইতে: ${contactBn}`,
        ] },
        { h: "নিরাপত্তা", list: [
          "ডেটাবেসের অ্যাক্সেস নিয়ম ঠিক করে কে কোন তথ্য দেখতে পারবে; অ্যাপ এই নিয়ম এড়াতে পারে না।",
          "অ্যাডমিন অ্যাকাউন্টে দুই ধাপের যাচাই বাধ্যতামূলক।",
          "পাসওয়ার্ড কখনো পড়ার মতো করে রাখা হয় না। ফাইল প্রাইভেট থাকে এবং অল্প সময়ের লিংক দিয়ে খোলে।",
        ] },
        { h: "পরিবর্তন ও যোগাযোগ", p: [`পরিবর্তন হলে এখানে জানাব এবং কার্যকর হওয়ার আগে অ্যাপে বলব। কার্যকর: ২৪ নভেম্বর ২০২৬। প্রশ্ন বা অভিযোগ: ${contactBn}`] },
      ],
    },
  },

  terms: {
    en: {
      title: "Terms of Service",
      summary: "The rules for using Cholo Kheli. By creating an account you agree to them.",
      sections: [
        { h: "The service", p: [`Cholo Kheli lets players post short highlight clips and lets verified scouts find them. ${B.name} runs it from ${B.city}. ${B.registration}`] },
        { h: "Who can use it", list: [
          "Players must be at least 13. Players under 18 need a parent or guardian's consent.",
          "Scouts must be 18 or older and pass our verification before they see any player.",
          "Use your real name and your own email. One person, one account.",
        ] },
        { h: "What you can post", list: [
          "Only clips of yourself, or clips you have permission to share. Keep them about sport.",
          "No nudity, violence, hate, harassment, threats, spam, or anyone else's personal details.",
          "No footage of other children without their parent or guardian's permission.",
          "Highlights are at most 60 seconds. We may compress clips so they play on every phone.",
        ] },
        { h: "Your content", p: [
          "You own what you upload. You let us store, compress and show it inside Cholo Kheli so the service works. We won't use it in advertising without asking you first.",
          "You can delete a highlight at any time; it disappears from the app straight away.",
        ] },
        { h: "Scouts", list: [
          "Contact players only through the admin-approved conversations in the app.",
          "Never ask a player for money, private photos, or to meet without a parent or guardian when they are under 18.",
          "Breaking these rules ends your access and may be reported to the authorities.",
        ] },
        { h: "Fees", p: [
          "Signing up and browsing are free. If we switch on an upload fee, the exact price is shown before you upload and again before you pay. There are no hidden charges, subscriptions or automatic renewals.",
          "Refunds follow our Refund Policy.",
        ] },
        { h: "What we don't promise", p: [
          "Scouts decide on their own. Posting a highlight does not guarantee a trial, a contract or a selection. We try to keep the service running but can't promise it will never be unavailable.",
        ] },
        { h: "Ending your account", p: [
          "You can delete your account at any time in Settings. We may suspend or remove accounts that break these terms, and we tell you why in the app.",
        ] },
        { h: "Law and contact", p: [`These terms follow the laws of Bangladesh. Effective ${B.legalEffective}. Questions: ${B.email}.`] },
      ],
    },
    bn: {
      title: "ব্যবহারের শর্তাবলি",
      summary: "চলো খেলি ব্যবহারের নিয়ম। অ্যাকাউন্ট খুললে আপনি এগুলো মেনে নিচ্ছেন।",
      sections: [
        { h: "সেবা", p: [`চলো খেলিতে খেলোয়াড়রা ছোট হাইলাইট ভিডিও দেন এবং যাচাই করা স্কাউটরা তাদের খুঁজে পান। ${B.name} ঢাকা থেকে এটি চালায়। কোম্পানি নিবন্ধনের কাজ চলছে।`] },
        { h: "কারা ব্যবহার করতে পারবেন", list: [
          "খেলোয়াড়ের বয়স কমপক্ষে ১৩ হতে হবে। ১৮ বছরের কম হলে মা-বাবা বা অভিভাবকের সম্মতি লাগবে।",
          "স্কাউটের বয়স ১৮ বা তার বেশি হতে হবে এবং কোনো খেলোয়াড় দেখার আগে আমাদের যাচাই পার হতে হবে।",
          "নিজের আসল নাম ও নিজের ইমেইল ব্যবহার করুন। একজনের একটি অ্যাকাউন্ট।",
        ] },
        { h: "যা পোস্ট করা যাবে", list: [
          "শুধু নিজের ভিডিও, অথবা যে ভিডিও শেয়ার করার অনুমতি আপনার আছে। বিষয় হবে খেলা।",
          "নগ্নতা, সহিংসতা, ঘৃণা, হয়রানি, হুমকি, স্প্যাম বা অন্যের ব্যক্তিগত তথ্য চলবে না।",
          "অন্য শিশুর ভিডিও তার মা-বাবা বা অভিভাবকের অনুমতি ছাড়া দেওয়া যাবে না।",
          "হাইলাইট সর্বোচ্চ ৬০ সেকেন্ড। সব ফোনে চলার জন্য আমরা ভিডিও ছোট করতে পারি।",
        ] },
        { h: "আপনার কনটেন্ট", p: [
          "আপনি যা আপলোড করেন তার মালিক আপনি। সেবা চালানোর জন্য চলো খেলির ভেতরে তা রাখা, ছোট করা ও দেখানোর অনুমতি আপনি আমাদের দিচ্ছেন। জিজ্ঞেস না করে বিজ্ঞাপনে ব্যবহার করব না।",
          "যেকোনো সময় হাইলাইট মুছতে পারেন; সঙ্গে সঙ্গে অ্যাপ থেকে সরে যায়।",
        ] },
        { h: "স্কাউটদের জন্য", list: [
          "শুধু অ্যাপের অ্যাডমিন-অনুমোদিত কথোপকথনে খেলোয়াড়ের সঙ্গে যোগাযোগ করুন।",
          "খেলোয়াড়ের কাছে টাকা বা ব্যক্তিগত ছবি চাইবেন না, এবং ১৮ বছরের কম হলে অভিভাবক ছাড়া দেখা করতে বলবেন না।",
          "এই নিয়ম ভাঙলে অ্যাক্সেস বন্ধ হবে এবং কর্তৃপক্ষকে জানানো হতে পারে।",
        ] },
        { h: "ফি", p: [
          "সাইন আপ ও দেখা বিনামূল্যে। আপলোড ফি চালু হলে আপলোডের আগে এবং পেমেন্টের আগে ঠিক দাম দেখানো হবে। কোনো লুকানো চার্জ, সাবস্ক্রিপশন বা স্বয়ংক্রিয় নবায়ন নেই।",
          "রিফান্ড আমাদের রিফান্ড নীতি অনুযায়ী।",
        ] },
        { h: "আমরা যা নিশ্চয়তা দিই না", p: [
          "স্কাউটরা নিজেরাই সিদ্ধান্ত নেন। হাইলাইট দিলেই ট্রায়াল, চুক্তি বা নির্বাচনের নিশ্চয়তা নেই। আমরা সেবা চালু রাখার চেষ্টা করি, তবে কখনো বন্ধ থাকবে না এমন নিশ্চয়তা দিতে পারি না।",
        ] },
        { h: "অ্যাকাউন্ট বন্ধ", p: [
          "সেটিংস থেকে যেকোনো সময় অ্যাকাউন্ট মুছতে পারেন। শর্ত ভাঙলে আমরা অ্যাকাউন্ট স্থগিত বা মুছে দিতে পারি, এবং কারণ অ্যাপে জানাই।",
        ] },
        { h: "আইন ও যোগাযোগ", p: [`এই শর্তাবলি বাংলাদেশের আইন অনুযায়ী। কার্যকর: ২৪ নভেম্বর ২০২৬। প্রশ্ন: ${B.email}।`] },
      ],
    },
  },

  refund: {
    en: {
      title: "Refund Policy",
      summary: "Upload fees are currently switched off. When they are on, this is how refunds work.",
      sections: [
        { h: "Current status", p: ["Uploading highlights is free right now. Nothing is charged."] },
        { h: "When an upload fee is on", list: [
          "The price per highlight is shown before you upload and again before you pay. That price is the total: no tax, service or processing fee is added by Cholo Kheli.",
          "Each payment covers one highlight. There are no subscriptions or automatic charges.",
        ] },
        { h: "You get a full refund if", list: [
          "You were charged but your highlight did not go live within 24 hours.",
          "You were charged twice for the same highlight.",
          "We remove your highlight for a reason that is our mistake.",
        ] },
        { h: "No refund if", list: [
          "The highlight went live and you later delete it, or it is removed for breaking our Terms.",
        ] },
        { h: "How to ask", p: [
          `Email ${B.email} with the subject "${B.subjects.refund}" and your invoice number (in your notifications). We reply within 7 days. Approved refunds go back to the same bKash account within 10 working days.`,
          "Players under 18: a parent or guardian can ask on your behalf.",
        ] },
      ],
    },
    bn: {
      title: "রিফান্ড নীতি",
      summary: "আপলোড ফি এখন বন্ধ আছে। চালু হলে রিফান্ড যেভাবে হবে।",
      sections: [
        { h: "এখনকার অবস্থা", p: ["এখন হাইলাইট আপলোড বিনামূল্যে। কোনো টাকা নেওয়া হয় না।"] },
        { h: "আপলোড ফি চালু থাকলে", list: [
          "প্রতি হাইলাইটের দাম আপলোডের আগে এবং পেমেন্টের আগে দেখানো হয়। এটাই মোট দাম: চলো খেলি কোনো কর, সার্ভিস বা প্রসেসিং ফি যোগ করে না।",
          "প্রতিটি পেমেন্ট একটি হাইলাইটের জন্য। কোনো সাবস্ক্রিপশন বা স্বয়ংক্রিয় চার্জ নেই।",
        ] },
        { h: "পুরো টাকা ফেরত পাবেন যদি", list: [
          "টাকা কাটা হয়েছে কিন্তু ২৪ ঘণ্টার মধ্যে হাইলাইট লাইভ হয়নি।",
          "একই হাইলাইটের জন্য দুবার টাকা কাটা হয়েছে।",
          "আমাদের ভুলে আপনার হাইলাইট সরানো হয়েছে।",
        ] },
        { h: "টাকা ফেরত হবে না যদি", list: [
          "হাইলাইট লাইভ হওয়ার পর আপনি মুছে ফেলেন, অথবা শর্ত ভাঙার কারণে তা সরানো হয়।",
        ] },
        { h: "কীভাবে চাইবেন", p: [
          `"${B.subjects.refund}" বিষয় লিখে ইনভয়েস নম্বরসহ (নোটিফিকেশনে আছে) ${B.email} ঠিকানায় ইমেইল করুন। ৭ দিনের মধ্যে উত্তর দিই। অনুমোদিত টাকা ১০ কর্মদিবসের মধ্যে একই bKash অ্যাকাউন্টে ফেরত যায়।`,
          "১৮ বছরের কম বয়সী খেলোয়াড়ের হয়ে মা-বাবা বা অভিভাবক চাইতে পারেন।",
        ] },
      ],
    },
  },

  cookies: {
    en: {
      title: "Cookie Policy",
      summary: "We only store what's needed to keep you signed in and remember your settings. No advertising or tracking cookies.",
      sections: [
        { h: "What we store on your device", list: [
          "Sign-in session: keeps you signed in. Essential.",
          "Language, theme and similar settings: so the app looks the way you chose. Essential.",
          "Your cookie choice: so we don't ask again. Essential.",
          "Small flags, such as whether we already asked about notifications. Essential.",
        ] },
        { h: "What we don't use", p: ["No advertising cookies, no tracking pixels and no third-party analytics. If we add optional analytics later, they stay off unless you choose \"Accept optional\" in the banner, and this page will list them first."] },
        { h: "Changing your choice", p: ["Clear this site's data in your browser to see the banner again. Clearing it also signs you out."] },
      ],
    },
    bn: {
      title: "কুকি নীতি",
      summary: "আপনাকে সাইন-ইন রাখতে আর সেটিংস মনে রাখতে যতটুকু দরকার শুধু ততটুকুই রাখি। কোনো বিজ্ঞাপন বা ট্র্যাকিং কুকি নেই।",
      sections: [
        { h: "আপনার ডিভাইসে যা রাখি", list: [
          "সাইন-ইন সেশন: আপনাকে সাইন-ইন রাখে। অপরিহার্য।",
          "ভাষা, থিম ও এ রকম সেটিংস: আপনার পছন্দমতো দেখাতে। অপরিহার্য।",
          "আপনার কুকি পছন্দ: যাতে আবার জিজ্ঞেস না করি। অপরিহার্য।",
          "ছোট কিছু চিহ্ন, যেমন নোটিফিকেশনের কথা আগে জিজ্ঞেস করা হয়েছে কি না। অপরিহার্য।",
        ] },
        { h: "যা ব্যবহার করি না", p: ["কোনো বিজ্ঞাপন কুকি, ট্র্যাকিং পিক্সেল বা বাইরের অ্যানালিটিক্স নেই। পরে ঐচ্ছিক অ্যানালিটিক্স যোগ করলে ব্যানারে \"ঐচ্ছিক গ্রহণ করুন\" না বাছা পর্যন্ত তা বন্ধ থাকবে, এবং আগে এই পাতায় জানানো হবে।"] },
        { h: "পছন্দ বদলানো", p: ["ব্যানার আবার দেখতে ব্রাউজারে এই সাইটের ডেটা মুছুন। এতে আপনি সাইন আউটও হয়ে যাবেন।"] },
      ],
    },
  },

  deletion: {
    en: {
      title: "Delete your data",
      summary: "How to delete your Cholo Kheli account and everything in it.",
      sections: [
        { h: "In the app or on the website", list: [
          "Sign in, open Settings, then Delete account.",
          "Confirm. Your profile, highlights, files, messages, likes, comments and follows are deleted straight away.",
        ] },
        { h: "If you can't sign in", p: [
          `Email ${B.email} from the address on the account, with the subject "${B.subjects.deletion}". We confirm it's your account, then delete it within 30 days and reply when it's done.`,
          "A parent or guardian can ask us to delete the account of a player under 18.",
        ] },
        { h: "What we keep", list: [
          "Invoices and payment records, for as long as tax law requires.",
          "Reports you made or received and moderation decisions, for up to 12 months, to stop repeat abuse.",
          "Backup copies, which expire within 30 days.",
        ] },
        { h: "Only some data", p: ["You can delete single highlights, comments or your profile photo at any time without deleting the account. For anything else, email us."] },
      ],
    },
    bn: {
      title: "আপনার তথ্য মুছুন",
      summary: "চলো খেলি অ্যাকাউন্ট ও তার সব তথ্য কীভাবে মুছবেন।",
      sections: [
        { h: "অ্যাপ বা ওয়েবসাইটে", list: [
          "সাইন ইন করে সেটিংস খুলুন, তারপর অ্যাকাউন্ট মুছুন।",
          "নিশ্চিত করুন। প্রোফাইল, হাইলাইট, ফাইল, মেসেজ, লাইক, মন্তব্য ও ফলো সঙ্গে সঙ্গে মুছে যায়।",
        ] },
        { h: "সাইন ইন করতে না পারলে", p: [
          `অ্যাকাউন্টের ইমেইল থেকে "${B.subjects.deletion}" বিষয় লিখে ${B.email} ঠিকানায় ইমেইল করুন। অ্যাকাউন্টটি আপনার কি না নিশ্চিত হয়ে ৩০ দিনের মধ্যে মুছে দিই এবং জানিয়ে দিই।`,
          "১৮ বছরের কম বয়সী খেলোয়াড়ের অ্যাকাউন্ট মুছতে মা-বাবা বা অভিভাবক বলতে পারেন।",
        ] },
        { h: "যা রেখে দিই", list: [
          "ইনভয়েস ও পেমেন্টের রেকর্ড, কর আইনে যতদিন দরকার।",
          "আপনার করা বা পাওয়া রিপোর্ট ও মডারেশনের সিদ্ধান্ত, বারবার অপব্যবহার ঠেকাতে সর্বোচ্চ ১২ মাস।",
          "ব্যাকআপ কপি, যা ৩০ দিনের মধ্যে মুছে যায়।",
        ] },
        { h: "কিছু তথ্য মুছতে চাইলে", p: ["অ্যাকাউন্ট না মুছেও যেকোনো সময় একটি হাইলাইট, মন্তব্য বা প্রোফাইল ছবি মুছতে পারেন। অন্য কিছুর জন্য ইমেইল করুন।"] },
      ],
    },
  },

  licences: {
    en: {
      title: "Credits and licences",
      summary: "Fonts, code and media we use, and the licences that allow it.",
      sections: [
        { h: "Fonts (self-hosted, free for commercial use)", list: [
          "Inter, Manrope, Onest, Space Grotesk, Anton, Bebas Neue, Noto Sans Bengali, Pacifico: SIL Open Font License 1.1.",
          "Permanent Marker: Apache License 2.0.",
        ] },
        { h: "Open-source software", list: [
          "React, TanStack Router and Start, Tailwind CSS, Radix UI, Framer Motion, Sonner: MIT licence. Lucide icons: ISC licence.",
          "Supabase client libraries: MIT licence. Capacitor: MIT licence. Mediabunny (in-app video editing): Mozilla Public License 2.0.",
        ] },
        { h: "Sounds and images", list: [
          "The sound effects in the video editor are generated in the app; no recorded samples are used.",
          "Player photos on the website are illustrations of the kind of athletes the platform serves, not real users.",
          "Club, federation and brand names belong to their owners. Mentioning them does not mean they endorse or partner with Cholo Kheli.",
        ] },
        { h: "Questions", p: [`If you believe something here infringes your rights, email ${B.email} with the subject "${B.subjects.legal}" and we will remove it while we check.`] },
      ],
    },
    bn: {
      title: "কৃতজ্ঞতা ও লাইসেন্স",
      summary: "আমাদের ব্যবহার করা ফন্ট, কোড ও মিডিয়া, এবং যে লাইসেন্সে তা ব্যবহার করা যায়।",
      sections: [
        { h: "ফন্ট (আমাদের সার্ভারে রাখা, বাণিজ্যিক ব্যবহারে বিনামূল্যে)", list: [
          "Inter, Manrope, Onest, Space Grotesk, Anton, Bebas Neue, Noto Sans Bengali, Pacifico: SIL Open Font License 1.1।",
          "Permanent Marker: Apache License 2.0।",
        ] },
        { h: "ওপেন-সোর্স সফটওয়্যার", list: [
          "React, TanStack Router ও Start, Tailwind CSS, Radix UI, Framer Motion, Sonner: MIT লাইসেন্স। Lucide আইকন: ISC লাইসেন্স।",
          "Supabase লাইব্রেরি: MIT লাইসেন্স। Capacitor: MIT লাইসেন্স। Mediabunny (অ্যাপের ভিডিও এডিটিং): Mozilla Public License 2.0।",
        ] },
        { h: "শব্দ ও ছবি", list: [
          "ভিডিও এডিটরের সাউন্ড ইফেক্ট অ্যাপেই তৈরি হয়; কোনো রেকর্ড করা নমুনা ব্যবহার হয় না।",
          "ওয়েবসাইটের খেলোয়াড়দের ছবি প্ল্যাটফর্ম যাদের জন্য তাদের উদাহরণ, আসল ব্যবহারকারী নয়।",
          "ক্লাব, ফেডারেশন ও ব্র্যান্ডের নাম তাদের মালিকদের। নাম উল্লেখ মানে তারা চলো খেলিকে সমর্থন বা অংশীদারত্ব দিচ্ছে না।",
        ] },
        { h: "প্রশ্ন", p: [`এখানে কিছু আপনার অধিকার লঙ্ঘন করছে মনে হলে "${B.subjects.legal}" বিষয় লিখে ${B.email} ঠিকানায় ইমেইল করুন; যাচাইয়ের সময় আমরা তা সরিয়ে রাখব।`] },
      ],
    },
  },
};
