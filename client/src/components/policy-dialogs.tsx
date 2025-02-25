import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface PolicyDialogProps {
  children: React.ReactNode;
  title: string;
  trigger?: React.ReactNode;
}

const PolicyDialog = ({ children, title, trigger }: PolicyDialogProps) => (
  <Dialog>
    <DialogTrigger asChild>
      {trigger || <span className="cursor-pointer hover:text-primary transition-colors">{title}</span>}
    </DialogTrigger>
    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="text-2xl font-bold tracking-tight">{title}</DialogTitle>
      </DialogHeader>
      <div className="mt-4 space-y-4 text-base leading-relaxed tracking-normal text-gray-900 dark:text-gray-100">
        {children}
      </div>
    </DialogContent>
  </Dialog>
);

export const TermsDialog = ({ trigger }: { trigger?: React.ReactNode }) => (
  <PolicyDialog title="Terms of Service" trigger={trigger}>
    <p className="mb-4">
      Effective Date: February 6, 2025
    </p>
    <p className="mb-6">
      Welcome to Habitizr! These Terms of Service ("Terms") govern your access to and use of Habitizr ("the App"), including our website, mobile application, and any related services (collectively, "Services"). By using the Services, you agree to be bound by these Terms. If you do not agree, please do not use the Services.
    </p>

    <h3 className="text-lg font-semibold mb-2">1. Eligibility</h3>
    <p className="mb-6">
      You must be at least 18 years old or the legal age of majority in your jurisdiction to use Habitizr. By using the Services, you represent and warrant that you have the legal capacity to enter into this agreement.
    </p>

    <h3 className="text-lg font-semibold mb-2">2. Account Registration</h3>
    <ul className="list-disc pl-6 mb-6 space-y-1">
      <li>You must create an account to use the Services.</li>
      <li>You agree to provide accurate, complete, and up-to-date information.</li>
      <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
      <li>Merk Digital Ltd. is not responsible for any unauthorized access to your account.</li>
    </ul>

    <h3 className="text-lg font-semibold mb-2">3. Use of Services</h3>
    <ul className="list-disc pl-6 mb-6 space-y-1">
      <li>Habitizr provides AI-driven habit tracking, reminders via SMS, and progress analysis.</li>
      <li>You agree to use the Services in accordance with applicable laws and regulations.</li>
      <li>You may not misuse, modify, disrupt, or interfere with the Services in any manner.</li>
      <li>You acknowledge that Habitizr is not a medical or professional service and does not provide health, psychological, or therapeutic advice.</li>
    </ul>

    <h3 className="text-lg font-semibold mb-2">4. Subscription and Payment</h3>
    <ul className="list-disc pl-6 mb-6 space-y-1">
      <li>Habitizr may offer free and paid subscription tiers.</li>
      <li>Payment is processed via third-party providers; we do not store payment details.</li>
      <li>Fees are non-refundable unless otherwise stated in our refund policy.</li>
    </ul>

    <h3 className="text-lg font-semibold mb-2">5. SMS Notifications and Carrier Fees</h3>
    <ul className="list-disc pl-6 mb-6 space-y-1">
      <li>By using Habitizr, you consent to receive SMS reminders and follow-up messages.</li>
      <li>Standard messaging rates and carrier fees may apply, and these costs are the sole responsibility of the user.</li>
      <li>Merk Digital Ltd. is not responsible for any additional charges incurred as a result of using the SMS services.</li>
      <li>The frequency of SMS messages depends on the habit schedule you set.</li>
      <li>You may opt-out at any time via account settings or by replying "STOP" to any message.</li>
      <li>We are not responsible for any failures, delays, or interruptions in SMS delivery due to carrier issues, network problems, or user device settings.</li>
    </ul>

    <h3 className="text-lg font-semibold mb-2">6. Data and Privacy</h3>
    <p className="mb-6">
      Your use of the Services is subject to our Privacy Policy, which outlines how we collect, store, and process personal data.
    </p>

    <h3 className="text-lg font-semibold mb-2">7. User Conduct</h3>
    <ul className="list-disc pl-6 mb-6 space-y-1">
      <li>You may not engage in fraudulent, harmful, or abusive behavior.</li>
      <li>You may not use automated tools to access or disrupt our Services.</li>
      <li>You must comply with all applicable laws regarding the use of SMS services, including any restrictions on automated messaging.</li>
    </ul>

    <h3 className="text-lg font-semibold mb-2">8. Termination</h3>
    <p className="mb-6">
      Habitizr reserves the right to suspend or terminate your account if you violate these Terms, fail to comply with applicable laws, or engage in prohibited conduct. We may also terminate accounts due to prolonged inactivity.
    </p>

    <h3 className="text-lg font-semibold mb-2">9. Disclaimers & Limitation of Liability</h3>
    <p className="mb-6">
      Habitizr, operated by Merk Digital Ltd., provides Services on an "as-is" and "as-available" basis without warranties of any kind.
    </p>
    <ul className="list-disc pl-6 mb-6 space-y-1">
      <li>We do not guarantee habit success, personal improvement, or uninterrupted Service functionality.</li>
      <li>Habitizr is not liable for any damages, losses, or third-party claims arising from your use of the Services.</li>
      <li>We are not responsible for any errors, omissions, interruptions, deletions, or defects in SMS delivery or application performance.</li>
      <li>You acknowledge that use of the Services is entirely at your own risk.</li>
      <li>To the maximum extent permitted by law, Habitizr and its affiliates, officers, directors, employees, agents, and partners shall not be liable for any direct, indirect, incidental, special, punitive, or consequential damages arising from your use or inability to use the Services.</li>
    </ul>

    <h3 className="text-lg font-semibold mb-2">10. Indemnification</h3>
    <p className="mb-6">
      You agree to indemnify, defend, and hold Habitizr, its affiliates, employees, and partners harmless from any claims, damages, losses, liabilities, or expenses arising from:
    </p>
    <ul className="list-disc pl-6 mb-6 space-y-1">
      <li>Your violation of these Terms;</li>
      <li>Your use or misuse of the Services;</li>
      <li>Your failure to comply with applicable laws and regulations.</li>
    </ul>

    <h3 className="text-lg font-semibold mb-2">11. Modifications to the Services and Terms</h3>
    <ul className="list-disc pl-6 mb-6 space-y-1">
      <li>We may modify or discontinue any aspect of the Services at any time without liability.</li>
      <li>We reserve the right to update these Terms. Your continued use of the Services after changes constitutes acceptance of the revised Terms.</li>
    </ul>

    <h3 className="text-lg font-semibold mb-2">12. Governing Law</h3>
    <p className="mb-6">
      These Terms shall be governed by the laws of British Columbia, Canada. Any disputes shall be resolved in British Columbia, Canada.
    </p>

    <h3 className="text-lg font-semibold mb-2">13. Contact Information</h3>
    <p>
      For any questions about these Terms, contact us at info@habitizr.com.
    </p>
  </PolicyDialog>
);

export const PrivacyDialog = ({ trigger }: { trigger?: React.ReactNode }) => (
  <PolicyDialog title="Privacy Policy" trigger={trigger}>
    <p className="mb-4">
      Effective Date: February 6, 2025
    </p>
    <p className="mb-6">
      Habitizr, operated by Merk Digital Ltd., is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your personal information when you use our services.
    </p>

    <h3 className="text-lg font-semibold mb-2">1. Information We Collect</h3>
    <ul className="list-disc pl-6 mb-6 space-y-1">
      <li>Account Information: Name, email, phone number, and password.</li>
      <li>Habit Tracking Data: User habits, completion status, AI-generated insights.</li>
      <li>SMS Data: Messages sent and received as part of habit tracking.</li>
      <li>Device & Usage Data: IP address, browser type, and interaction data.</li>
    </ul>

    <h3 className="text-lg font-semibold mb-2">2. How We Use Your Information</h3>
    <ul className="list-disc pl-6 mb-6 space-y-1">
      <li>To provide and improve our habit-tracking services.</li>
      <li>To send SMS reminders and notifications.</li>
      <li>To analyze data trends and user behavior.</li>
      <li>To comply with legal obligations.</li>
    </ul>

    <h3 className="text-lg font-semibold mb-2">3. Data Sharing & Third Parties</h3>
    <ul className="list-disc pl-6 mb-6 space-y-1">
      <li>We do not sell personal data.</li>
      <li>Data is shared with SMS and payment processing providers as necessary.</li>
      <li>We may disclose data if required by law.</li>
    </ul>

    <h3 className="text-lg font-semibold mb-2">4. Your Rights & Choices</h3>
    <ul className="list-disc pl-6 mb-6 space-y-1">
      <li>Users can access, update, or delete their data.</li>
      <li>Users may opt out of SMS notifications.</li>
    </ul>

    <h3 className="text-lg font-semibold mb-2">5. Data Security</h3>
    <p className="mb-6">
      We employ reasonable security measures but cannot guarantee absolute security.
    </p>

    <p>
      For questions about this Privacy Policy, contact <a href="mailto:info@habitizr.com" className="text-primary hover:underline">info@habitizr.com</a>.
    </p>
  </PolicyDialog>
);

export const ContactDialog = ({ trigger }: { trigger?: React.ReactNode }) => (
  <PolicyDialog title="Contact Us" trigger={trigger}>
    <p className="text-lg">
      Contact us at <a href="mailto:info@habitizr.com" className="text-primary hover:underline">info@habitizr.com</a>
    </p>
  </PolicyDialog>
);

export const CookieDialog = ({ trigger }: { trigger?: React.ReactNode }) => (
  <PolicyDialog title="Cookie Policy" trigger={trigger}>
    <p className="mb-4">
      Effective Date: Feb 6, 2025
    </p>
    <p className="mb-6">
      Habitizr uses cookies and similar tracking technologies to enhance user experience.
    </p>

    <h3 className="text-lg font-semibold mb-2">1. What Are Cookies?</h3>
    <p className="mb-6">
      Cookies are small text files stored on your device that help us improve the functionality and performance of our Services.
    </p>

    <h3 className="text-lg font-semibold mb-2">2. Types of Cookies We Use</h3>
    <ul className="list-disc pl-6 mb-6 space-y-1">
      <li>Essential Cookies: Required for basic functionality (e.g., authentication).</li>
      <li>Performance Cookies: Help us analyze user behavior to improve the App.</li>
      <li>Functional Cookies: Enhance user experience by remembering preferences.</li>
      <li>Marketing Cookies: Used for targeted ads and promotional content (if applicable).</li>
    </ul>

    <h3 className="text-lg font-semibold mb-2">3. Managing Cookies</h3>
    <ul className="list-disc pl-6 mb-6 space-y-1">
      <li>You can control or disable cookies via browser settings.</li>
      <li>Disabling cookies may affect Service functionality.</li>
    </ul>

    <h3 className="text-lg font-semibold mb-2">4. Third-Party Cookies</h3>
    <p className="mb-6">
      Some cookies are placed by third-party analytics or advertising partners.
    </p>

    <h3 className="text-lg font-semibold mb-2">5. Changes to This Policy</h3>
    <p className="mb-6">
      We may update this Cookie Policy periodically.
    </p>

    <p>
      For any questions, contact us at info@habitizr.com.
    </p>
  </PolicyDialog>
);