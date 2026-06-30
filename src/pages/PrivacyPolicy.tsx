import { Link } from "@tanstack/react-router";
import CholoKheliMark from "@/components/CholoKheliMark";
import { useLanguage } from "@/i18n/LanguageProvider";
import PrivacyPolicyBn from "./PrivacyPolicyBn";

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mb-10">
    <h2 className="font-display text-2xl sm:text-3xl text-[hsl(var(--teal-deep))] mb-4">{title}</h2>
    <div className="space-y-3 text-[15px] leading-relaxed text-foreground/85">{children}</div>
  </section>
);

const Sub = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="mt-5">
    <h3 className="font-semibold text-foreground mb-2">{title}</h3>
    <div className="space-y-2">{children}</div>
  </div>
);

const Bullets = ({ items }: { items: string[] }) => (
  <ul className="list-disc pl-6 space-y-1.5 marker:text-[hsl(var(--teal-deep))]">
    {items.map((i, k) => (
      <li key={k}>{i}</li>
    ))}
  </ul>
);

const Table = ({ head, rows }: { head: string[]; rows: string[][] }) => (
  <div className="overflow-x-auto border border-border rounded-xl my-4">
    <table className="w-full text-sm">
      <thead className="bg-secondary">
        <tr>
          {head.map((h, i) => (
            <th key={i} className="text-left p-3 font-semibold text-foreground">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="border-t border-border align-top">
            {r.map((c, j) => (
              <td key={j} className="p-3 text-foreground/80">{c}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const PrivacyPolicy = () => {
  const { lang } = useLanguage();
  if (lang === "bn") return <PrivacyPolicyBn />;
  return (
    <main className="min-h-screen pt-28 pb-24 px-4 bg-gradient-to-b from-[hsl(var(--paper))] to-[hsl(var(--teal-deep)/0.06)]">
      <article className="max-w-3xl mx-auto">
        <header className="mb-10 text-center">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <CholoKheliMark className="h-9 w-9" />
            <span className="font-display text-xl tracking-[0.04em] text-[hsl(var(--teal-deep))] font-semibold">
              CHOLO <span className="font-bold">KHELI</span>
            </span>
          </Link>
          <h1 className="font-display text-4xl sm:text-5xl text-[hsl(var(--teal-deep))] mb-3">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground">
            Scout.BD · Khelo Bangladesh · Version 1.0
            <br />
            Effective Date: 1 July 2025 · Last Reviewed: 29 June 2025
            <br />
            Governed by the Laws of the People's Republic of Bangladesh
          </p>
        </header>

        <div className="bg-card border border-border rounded-2xl p-5 mb-8 text-sm">
          <strong className="text-foreground">PLEASE READ THIS POLICY CAREFULLY.</strong>{" "}
          By registering, accessing, or using the Cholokheli platform (including all mobile applications, web interfaces,
          and associated services operating under the Scout.BD and Khelo Bangladesh brands), you acknowledge that you have
          read, understood, and agree to be bound by this Privacy Policy. If you do not agree, you must immediately cease
          using the Platform.
        </div>

        <Section title="1. Definitions and Interpretation">
          <p>For the purposes of this Privacy Policy, the following terms shall have the meanings set out below:</p>
          <Table
            head={["Term", "Definition"]}
            rows={[
              ["“Platform”", "The Cholokheli web application, mobile application, APIs, and any sub-platform operating under the brands Scout.BD and Khelo Bangladesh."],
              ["“We”, “Us”, “Our”", "Cholokheli, its founders, co-founders, operators, and all persons acting on its behalf."],
              ["“User”, “You”", "Any individual or entity accessing or using the Platform, including Athletes, Scouts, Club Representatives, Academy Administrators, Parents/Guardians, and Visitors."],
              ["“Athlete” / “Player”", "A registered individual who creates a player profile and uploads athletic data or video content to the Platform."],
              ["“Scout”", "A verified professional or institutional representative granted elevated read/write access to athlete profiles."],
              ["“Personal Data”", "Any information relating to an identified or identifiable natural person, as defined under applicable Bangladeshi law."],
              ["“Sensitive Personal Data”", "Data relating to health, biometric characteristics, minors, financial information, or any data designated as sensitive under applicable law."],
              ["“Processing”", "Any operation performed on Personal Data, including collection, recording, storage, use, disclosure, erasure, or destruction."],
              ["“Data Controller”", "Cholokheli, which determines the purposes and means of Processing Personal Data."],
              ["“UGC”", "User-Generated Content, including video highlights, match footage, performance clips, and commentary uploaded by Users."],
              ["“AI Engine”", "The generative AI system integrated into the Platform that analyses athlete metrics and returns structured scouting reports."],
              ["“RLS”", "Row Level Security policies applied within the Supabase database infrastructure governing access to data rows by User role."],
              ["“OTP”", "One-Time Password, the authentication mechanism used for account verification and login."],
              ["“Minor”", "Any individual below the age of eighteen (18) years."],
              ["“Applicable Law”", "The Digital Security Act 2018; the ICT Act 2006 as amended; the Penal Code 1860; the Bangladesh Telecommunication Act 2001; the Contract Act 1872; and all subsidiary legislation."],
            ]}
          />
        </Section>

        <Section title="2. Identity of the Data Controller & Contact">
          <p><strong>Platform Name:</strong> Cholokheli (operating under Scout.BD and Khelo Bangladesh)</p>
          <p><strong>Jurisdiction:</strong> People's Republic of Bangladesh</p>
          <p><strong>Principal Place of Business:</strong> Dhaka, Bangladesh</p>
          <p><strong>Privacy:</strong> privacy@cholokheli.com.bd</p>
          <p><strong>Grievance Officer:</strong> grievance@cholokheli.com.bd</p>
          <p>We acknowledge privacy-related requests within seventy-two (72) hours and provide a substantive response within thirty (30) calendar days.</p>
        </Section>

        <Section title="3. Scope and Applicability">
          <p>This Privacy Policy applies to:</p>
          <Bullets items={[
            "All users of the Cholokheli Platform across all supported sports verticals, including football, cricket, tennis, padel, badminton, and table tennis.",
            "All devices and platforms through which the Service is accessed (web browsers, iOS and Android apps, API integrations).",
            "All categories of users including Athletes, Scouts, Club Representatives, Academy Administrators, Parents/Guardians, and unauthenticated Visitors.",
            "All data collected, processed, stored, or transmitted in connection with the operation of the Platform.",
          ]} />
          <p>This Privacy Policy does NOT apply to:</p>
          <Bullets items={[
            "Third-party websites or services linked to from the Platform.",
            "Employment or contractor relationships governed by separate agreements.",
            "Anonymised or irreversibly de-identified aggregate data.",
          ]} />
        </Section>

        <Section title="4. Categories of Personal Data We Collect">
          <Sub title="4.1 Identity & Registration Data">
            <Bullets items={[
              "Full legal name, preferred display name, and date of birth.",
              "Gender, nationality, and country/city of residence.",
              "Email address and mobile phone number (used for OTP authentication).",
              "Profile photographs and avatar images.",
              "Verification credentials submitted by Scouts, Club Representatives, or Academy Administrators.",
            ]} />
          </Sub>
          <Sub title="4.2 Athletic & Performance Data">
            <Bullets items={[
              "Sport(s) registered, playing position(s), and experience level.",
              "Physical attributes (height, weight, dominant foot/hand, stamina, pace, and other measurable metrics).",
              "Match statistics, training session records, and competition history.",
              "Coach notes, evaluations, and tactical annotations.",
              "AI Engine output data including ratings, strengths and weaknesses, comparable benchmarks, and tactical recommendations.",
              "Spider/radar chart visualisation data generated from your profile metrics.",
            ]} />
          </Sub>
          <Sub title="4.3 User-Generated Content (UGC)">
            <Bullets items={[
              "Video clips, highlight reels, match footage, and training recordings uploaded to the 5TB storage vault.",
              "Embedded metadata (EXIF, geolocation tags, timestamps, device info).",
              "Textual comments, captions, annotations, and descriptions.",
            ]} />
          </Sub>
          <Sub title="4.4 Technical & Device Data">
            <Bullets items={[
              "IP address, browser type/version, OS, and device type.",
              "Unique device identifiers and session tokens.",
              "Log files, access timestamps, error reports, and diagnostic data.",
              "Cookie data and similar tracking technologies (see Section 12).",
              "Referral URLs and navigation paths within the Platform.",
            ]} />
          </Sub>
          <Sub title="4.5 Behavioural & Usage Data">
            <Bullets items={[
              "Pages visited, features accessed, search queries entered, and time spent on the Platform.",
              "Interactions with other users' profiles (including Scout views of Athlete profiles).",
              "Frequency and patterns of Platform use.",
            ]} />
          </Sub>
          <Sub title="4.6 Communication Data">
            <Bullets items={[
              "Messages, feedback, support requests, and complaints submitted via Platform channels.",
              "Records of correspondence between you and Cholokheli staff.",
            ]} />
          </Sub>
          <Sub title="4.7 Minor-Related Data">
            <p>Where an Athlete is a Minor, we additionally collect:</p>
            <Bullets items={[
              "Name, contact information, and relationship of the parent or legal guardian.",
              "Written consent documentation provided by the parent or legal guardian.",
              "Any additional information provided by the parent or guardian to support the Minor's profile.",
            ]} />
          </Sub>
          <div className="mt-4 p-4 bg-secondary border border-border rounded-xl text-sm">
            <strong>Notice on Sensitive Data:</strong> Physical performance metrics may, in certain contexts, constitute health-related or biometric information. We treat all such data with the highest standard of care and process it only with your explicit consent or where strictly necessary for athlete development and scouting.
          </div>
        </Section>

        <Section title="5. How We Collect Your Personal Data">
          <Sub title="5.1 Data Provided Directly By You">
            <Bullets items={[
              "Account registration forms (email and phone for OTP).",
              "Player profile creation and update workflows.",
              "Manual upload of UGC video content and media.",
              "Form submissions of athletic metrics, physical attributes, and coach notes.",
              "Support and grievance submissions.",
            ]} />
          </Sub>
          <Sub title="5.2 Data Collected Automatically">
            <Bullets items={[
              "Technical log data when you access the Platform.",
              "Cookies and local storage mechanisms.",
              "Metadata extracted from uploaded files.",
            ]} />
          </Sub>
          <Sub title="5.3 Data Generated by the Platform">
            <Bullets items={[
              "AI Engine scouting reports and ratings.",
              "Spider/radar chart visualisation data.",
              "Timestamps of all Platform interactions.",
            ]} />
          </Sub>
          <Sub title="5.4 Data Received From Third Parties">
            <Bullets items={[
              "Verification data from institutional bodies, federations, or clubs for Scout/Administrator verification.",
              "Technical data from infrastructure providers, including Supabase and cloud hosting services.",
            ]} />
          </Sub>
        </Section>

        <Section title="6. Lawful Basis and Purpose of Processing">
          <p>We process your Personal Data only where we have a lawful basis to do so under Applicable Law.</p>
          <Table
            head={["Purpose", "Categories of Data", "Lawful Basis"]}
            rows={[
              ["Account creation, authentication, and management", "Identity Data, OTP credentials", "Performance of contract / Consent"],
              ["Providing athlete profile and scouting services", "Athletic Data, UGC, AI outputs", "Performance of contract"],
              ["Generating AI-powered reports and radar charts", "Athletic metrics, coach notes, attributes", "Contract; Legitimate interest"],
              ["Enabling Scouts to discover and evaluate athletes", "Athlete profiles, performance data, UGC", "Contract; Legitimate interest"],
              ["Platform security and fraud prevention", "Technical Data, IP, session data", "Legitimate interest; Legal obligation"],
              ["Improving AI Engine accuracy and Platform features", "Anonymised/aggregated usage data", "Legitimate interest (anonymised)"],
              ["Communicating with Users about accounts or requests", "Identity Data, Communication Data", "Contract; Legitimate interest"],
              ["Service-related notifications", "Email, phone number", "Contract; Legitimate interest"],
              ["Legal compliance and dispute resolution", "All relevant categories", "Compliance with legal obligation"],
              ["Processing data of Minors", "Minor and Guardian data", "Explicit consent of parent/guardian"],
              ["Analytics to improve the Platform", "Anonymised behavioural data", "Legitimate interest (anonymised)"],
            ]}
          />
          <div className="mt-4 p-4 bg-secondary border border-border rounded-xl text-sm">
            <strong>AI Processing Notice:</strong> When you submit athletic metrics to the AI Engine, the data is processed by a generative AI model to produce a scouting report. You expressly consent to this processing by submitting your metrics. AI reports are a decision-support tool and do not constitute a binding evaluation. Cholokheli does not guarantee the accuracy of AI-generated assessments.
          </div>
        </Section>

        <Section title="7. Data Sharing, Disclosure, and Third Parties">
          <p>We do not sell your Personal Data. We do not rent, trade, or transfer it to third parties for their independent marketing purposes.</p>
          <Sub title="7.1 Within the Platform — Role-Based Access">
            <Bullets items={[
              "Athletes view and edit only their own profile metrics, UGC, and AI reports.",
              "Verified Scouts have protected read access to Athlete profiles; they cannot edit Athlete data without consent.",
              "Club Representatives and Academy Administrators are limited to data relevant to their institutional function.",
              "Platform administrators access data only as necessary for maintenance, security, and legal compliance.",
            ]} />
          </Sub>
          <Sub title="7.2 Service Providers">
            <Bullets items={[
              "Supabase (database, authentication, storage).",
              "Cloud infrastructure and CDN providers.",
              "AI model providers (bound by data processing agreements).",
              "Video storage and hosting providers for the UGC vault.",
              "Email and SMS OTP delivery providers.",
              "Legal, accounting, and compliance advisors under professional confidentiality.",
            ]} />
          </Sub>
          <Sub title="7.3 Disclosure Required by Law">
            <Bullets items={[
              "Compliance with orders under the Digital Security Act 2018 or the ICT Act 2006.",
              "Lawful requests in civil or criminal proceedings.",
              "Protection of the rights, property, or safety of Cholokheli, its users, or third parties.",
            ]} />
          </Sub>
          <Sub title="7.4 Business Transfers">
            <p>In a merger, acquisition, restructuring, joint venture, or asset sale, your Personal Data may transfer to the successor entity. You will be notified prior to any such transfer.</p>
          </Sub>
          <Sub title="7.5 Public Content">
            <p>Certain information you choose to make public on your Athlete profile (e.g., name, sport, position, and public highlight clips) may be visible to all registered Users. Review your privacy settings before making your profile publicly discoverable.</p>
          </Sub>
        </Section>

        <Section title="8. Data Retention">
          <Table
            head={["Category of Data", "Retention Period"]}
            rows={[
              ["Active account data (identity, profile, metrics)", "Duration of account, plus 3 years after closure."],
              ["UGC (video content and media)", "Duration of account. Removed from active storage within 30 days and backups within 90 days after deletion."],
              ["AI Engine reports and outputs", "Duration of account, plus 3 years after closure."],
              ["Authentication logs (OTP, login events)", "12 months from log entry."],
              ["Technical and device data", "12 months from collection."],
              ["Communication and support records", "5 years from communication."],
              ["Legal hold data", "Until resolution plus applicable statutory limitation period."],
              ["Financial transaction records (if applicable)", "7 years per Bangladeshi financial record-keeping requirements."],
            ]}
          />
          <p>Upon expiry, data is securely deleted or anonymised. Anonymised data may be retained indefinitely for analytics and platform improvement.</p>
        </Section>

        <Section title="9. Data Security">
          <Sub title="9.1 Technical Safeguards">
            <Bullets items={[
              "Row Level Security (RLS) at the Supabase database layer.",
              "OTP authentication as the sole login mechanism.",
              "Encryption in transit (TLS/SSL) and at rest.",
              "Dedicated, access-controlled 5TB storage vault for UGC.",
              "Regular security patches and infrastructure updates.",
              "Network-level access controls and firewall protections.",
            ]} />
          </Sub>
          <Sub title="9.2 Administrative Safeguards">
            <Bullets items={[
              "Access restricted to authorised personnel on a need-to-know basis.",
              "Co-founders operate in defined, non-overlapping access lanes.",
              "Confidentiality obligations on all persons with access to Personal Data.",
            ]} />
          </Sub>
          <Sub title="9.3 Incident Response">
            <Bullets items={[
              "Containment and impact assessment immediately on discovery.",
              "Notification to affected Users within 72 hours where the breach poses material risk.",
              "Mitigation steps and full record-keeping of breaches and responses.",
            ]} />
          </Sub>
          <p className="text-sm italic">Security Limitation: No system is completely secure. You use the Platform at your own risk and should safeguard your devices and credentials.</p>
        </Section>

        <Section title="10. Your Rights in Relation to Your Personal Data">
          <p>To exercise these rights, contact privacy@cholokheli.com.bd. We respond within thirty (30) calendar days and may require identity verification.</p>
          <Table
            head={["Right", "Description"]}
            rows={[
              ["Right of Access", "Request a copy of the Personal Data we hold about you."],
              ["Right to Rectification", "Request correction of inaccurate or incomplete data; many fields are editable in your account settings."],
              ["Right to Erasure", "Request deletion in certain circumstances, subject to legal retention obligations."],
              ["Right to Restriction", "Request restriction of processing pending verification of accuracy or objections."],
              ["Right to Object", "Object to processing based on legitimate interests."],
              ["Right to Data Portability", "Receive your data in a structured, commonly used, machine-readable format."],
              ["Right to Withdraw Consent", "Withdraw consent at any time without affecting prior lawful processing."],
              ["Right to Non-Discrimination", "We will not penalise you for exercising your privacy rights."],
              ["Right to Lodge a Complaint", "Contact grievance@cholokheli.com.bd or escalate to the BTRC or competent authority."],
            ]}
          />
        </Section>

        <Section title="11. Special Provisions for Minors">
          <Bullets items={[
            "No Minor may register or use the Platform without explicit, verifiable prior consent of a parent or legal guardian.",
            "A parent or legal guardian must create or co-create the Minor's account with accurate contact information and consent declaration.",
            "A Minor's profile will not be publicly discoverable without affirmative parental/guardian consent.",
            "Scouts accessing Minor profiles are subject to enhanced accountability measures.",
            "We do not knowingly collect data from individuals below 13. Any such data discovered will be deleted immediately.",
            "Parents/guardians may request access, correction, or deletion of their child's data at any time.",
            "We do not use Minor athletes' data for advertising or commercial profiling.",
          ]} />
          <p>By registering a Minor, the parent or legal guardian represents and warrants full legal authority to consent on behalf of the Minor and accepts this Policy and our Terms of Service on the Minor's behalf.</p>
        </Section>

        <Section title="12. Cookies and Similar Tracking Technologies">
          <p>The Platform uses cookies and similar technologies (including local storage and session storage).</p>
          <Table
            head={["Cookie Type", "Purpose"]}
            rows={[
              ["Strictly Necessary", "Session management and authentication state required for OTP login. Cannot be disabled while using the Platform."],
              ["Functional", "Remember preferences, sport selections, and display settings."],
              ["Analytics", "Aggregated, anonymised insight into Platform usage to improve the product."],
              ["Security", "Fraud detection, account integrity, and incident response."],
            ]}
          />
          <p>You can manage non-essential cookies through your browser settings or via the consent banner shown on first visit. Disabling certain cookies may impair functionality.</p>
        </Section>

        <Section title="13. International Data Transfers">
          <p>Cholokheli is based in Bangladesh and primarily processes data within Bangladesh. Given our cloud and AI provider relationships, your data may be transferred to and processed in other jurisdictions under data processing agreements ensuring equivalent protection. AI model providers are contractually bound to use submitted data only for the requested scouting output.</p>
        </Section>

        <Section title="14. User-Generated Content — Specific Provisions">
          <Bullets items={[
            "You grant Cholokheli a non-exclusive, royalty-free, worldwide licence to store, process, display, and transmit your UGC solely to operate the Platform, provide scouting services, and (where opted in) for promotional purposes.",
            "You retain all intellectual property rights in your UGC.",
            "You are solely responsible for ensuring your UGC does not infringe third-party rights.",
            "By uploading footage featuring others, you warrant you have obtained necessary consents or that inclusion is incidental.",
            "We may remove UGC violating this Policy, our Terms, or law.",
            "Embedded geolocation metadata is not publicly exposed without your explicit consent.",
          ]} />
        </Section>

        <Section title="15. AI Engine — Specific Data Provisions">
          <Bullets items={[
            "The AI Engine processes your submitted metrics, attributes, position, and coach notes to generate a structured scouting report.",
            "Submitted data is transmitted to AI model providers under data processing agreements; providers cannot use your data for model training without your separate explicit consent.",
            "AI reports are stored against your profile and visible to you and (per your privacy settings) verified Scouts.",
            "AI outputs are algorithmic and not a substitute for professional coaching, scouting, or medical advice.",
            "Cholokheli disclaims liability for third-party decisions based on AI Engine outputs.",
            "Deletion of AI reports may be requested at privacy@cholokheli.com.bd, subject to retention obligations.",
          ]} />
        </Section>

        <Section title="16. Scouts and Institutional Account Holders">
          <Bullets items={[
            "Scout and Institutional applicants consent to verification of credentials, affiliation, and identity documents.",
            "Verification data is retained for the duration of the account plus 3 years.",
            "Scout access to Athlete profiles is governed by RLS and logged.",
            "Scouts must use Athlete data only for legitimate talent identification within their professional role.",
            "Misuse may result in immediate termination and referral to legal or sporting authorities.",
            "Institutional account holders accept this Policy on their own behalf and as authorised representative of their institution.",
          ]} />
        </Section>

        <Section title="17. Intellectual Property and Data Ownership">
          <Bullets items={[
            "You own all Personal Data and UGC you create and submit.",
            "Cholokheli owns the Platform infrastructure, algorithms, AI Engine architecture, scouting report formats, and chart rendering logic.",
            "AI output formats, scoring schema, attribute taxonomy, and benchmarking methodology are proprietary to Cholokheli.",
            "You may export your profile data and AI reports for personal use; commercial exploitation of Cholokheli's proprietary formats requires written consent.",
          ]} />
        </Section>

        <Section title="18. Legal Compliance — Bangladesh Specific">
          <Sub title="18.1 Digital Security Act, 2018">
            <Bullets items={[
              "We do not process Personal Data in any manner that would constitute an offence under Sections 17–23 of the Act.",
              "We cooperate with lawful requests and disclose data only under lawful order.",
              "We maintain reasonable digital security measures as contemplated under the Act.",
            ]} />
          </Sub>
          <Sub title="18.2 ICT Act, 2006 (as amended)">
            <Bullets items={[
              "Processing follows the principles of the ICT Act.",
              "Any publication or transmission is for legitimate purposes only, complying with Sections 54–57 where applicable.",
            ]} />
          </Sub>
          <Sub title="18.3 Bangladesh Telecommunication Act, 2001">
            <Bullets items={["SMS OTP services operate in compliance with the Act and BTRC regulations."]} />
          </Sub>
          <Sub title="18.4 Contract Act, 1872">
            <Bullets items={["Acceptance of this Policy at registration constitutes free and informed consent under the Contract Act."]} />
          </Sub>
          <Sub title="18.5 Consumer Rights">
            <Bullets items={["We comply with the Consumer Rights Protection Act, 2009 where applicable."]} />
          </Sub>
        </Section>

        <Section title="19. Limitation of Liability">
          <Bullets items={[
            "Cholokheli is not liable for indirect, incidental, consequential, special, or punitive damages.",
            "Aggregate liability is capped at amounts paid by the User to Cholokheli in the preceding 12 months.",
            "Cholokheli is not liable for the accuracy, completeness, or suitability of AI Engine outputs.",
            "Cholokheli is not liable for third-party decisions based on data accessed through the Platform.",
            "Cholokheli is not liable for breaches caused by your failure to safeguard credentials or use of unsecured networks.",
            "Cholokheli is not responsible for the content or practices of third-party websites linked from the Platform.",
          ]} />
        </Section>

        <Section title="20. Indemnification">
          <p>You agree to indemnify and hold harmless Cholokheli, its co-founders, officers, employees, agents, licensors, and service providers from any claims arising from:</p>
          <Bullets items={[
            "Your violation of this Policy or our Terms of Service.",
            "Submission of inaccurate, false, or misleading Personal Data.",
            "Upload of UGC infringing third-party rights.",
            "Registration of a Minor without proper parental authority or consent.",
            "Misuse of data accessed through your Scout or Institutional account.",
            "Breach of your representations and warranties.",
          ]} />
        </Section>

        <Section title="21. Grievance Redressal Mechanism">
          <Bullets items={[
            "Step 1 — Submit your grievance to grievance@cholokheli.com.bd with details and supporting documentation.",
            "Step 2 — Acknowledgement within 72 hours.",
            "Step 3 — Investigation and substantive response within 30 calendar days.",
            "Step 4 — Resolution with corrective action where the grievance is upheld.",
            "Step 5 — Escalation to the BTRC or the courts of Bangladesh if you remain unsatisfied.",
          ]} />
          <p>Retaliation against any User for exercising privacy rights or lodging a good-faith complaint is strictly prohibited.</p>
        </Section>

        <Section title="22. Changes to this Privacy Policy">
          <Bullets items={[
            "Updated Policy will be posted on the Platform with a revised Effective Date.",
            "Material changes are notified via email and/or in-Platform notification.",
            "Continued use after the revised Effective Date constitutes acceptance.",
            "If you do not accept the changes, you must cease using the Platform and may request deletion.",
          ]} />
        </Section>

        <Section title="23. Governing Law and Jurisdiction">
          <p>This Policy is governed by the laws of the People's Republic of Bangladesh. The courts of Bangladesh, sitting in Dhaka, have exclusive jurisdiction over any dispute, claim, or proceeding arising under it. Cholokheli may seek urgent injunctive relief in any jurisdiction where necessary to protect its IP, confidential information, or to prevent ongoing harm.</p>
        </Section>

        <Section title="24. Third-Party Platforms and Tools">
          <Bullets items={[
            "Supabase is our core database and authentication provider.",
            "Next.js and Tailwind CSS are front-end frameworks and do not independently process Personal Data.",
            "AI model providers power the AI Engine under data processing agreements.",
            "Video production and marketing tools (Flow Pro, Whisk Pro, Google Vids Pro, Canva) are used internally and do not receive User Personal Data.",
            "Future integrations involving Personal Data will be disclosed through an update to this Policy.",
          ]} />
        </Section>

        <Section title="25. Disclaimers">
          <p>THE PLATFORM IS PROVIDED ON AN “AS IS” AND “AS AVAILABLE” BASIS. CHOLOKHELI DISCLAIMS ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, AND UNINTERRUPTED OR ERROR-FREE OPERATION.</p>
          <p>AI Engine assessments are provided for informational and developmental purposes only and are not professional sporting, medical, or fitness advice.</p>
        </Section>

        <Section title="26. Contact Information Summary">
          <Table
            head={["Matter", "Contact"]}
            rows={[
              ["General privacy inquiries", "privacy@cholokheli.com.bd"],
              ["Grievances and complaints", "grievance@cholokheli.com.bd"],
              ["Data access, correction, or deletion", "privacy@cholokheli.com.bd"],
              ["Legal notices", "legal@cholokheli.com.bd"],
              ["Parental / guardian consent and Minor queries", "privacy@cholokheli.com.bd (subject: MINOR ACCOUNT)"],
              ["Media and press", "media@cholokheli.com.bd"],
            ]}
          />
        </Section>

        <footer className="text-center text-xs text-muted-foreground border-t border-border pt-8 mt-12">
          Dhaka, Bangladesh · Privacy Policy — Version 1.0 · Effective 1 July 2025
          <br />
          © 2025 Cholokheli / Scout.BD. All Rights Reserved. Registered in Bangladesh.
        </footer>
      </article>
    </main>
  );
};

export default PrivacyPolicy;
