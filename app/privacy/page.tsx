'use client';

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import './page-styles.css';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background pt-8 pb-16 overflow-y-auto" style={{ height: '100vh', overflowY: 'auto' }}>
      <div className="container max-w-3xl mx-auto px-4">
        <div className="mb-8">
          <Link href="/" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="h-4 w-4" />
            Back to home
          </Link>
        </div>
        
        <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>
        
        <div className="prose dark:prose-invert max-w-none">
          <p className="text-sm text-muted-foreground mb-4">Last updated: July 29, 2025</p>
          
          <h2>1. Introduction</h2>
          <p>
            At BOS, we respect your privacy and are committed to protecting your personal data. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform.
          </p>
          
          <h2>2. Information We Collect</h2>
          
          <h3>2.1 Information You Provide</h3>
          <p>We may collect the following types of information that you voluntarily provide to us:</p>
          <ul>
            <li><strong>Account Information:</strong> When you register, we collect your name, email address, username, and password.</li>
            <li><strong>Profile Information:</strong> Information you add to your profile, such as profile picture, bio, location, and links to your other social profiles.</li>
            <li><strong>Content:</strong> Any posts, comments, roadmaps, milestones, tasks, and other content you create or upload to the platform.</li>
            <li><strong>Communications:</strong> Messages you send to other users and communications with us.</li>
          </ul>
          
          <h3>2.2 Information We Collect Automatically</h3>
          <p>When you use our platform, we may automatically collect certain information, including:</p>
          <ul>
            <li><strong>Device Information:</strong> Type of device, operating system, unique device identifiers, and network information.</li>
            <li><strong>Usage Data:</strong> How you interact with our platform, including pages viewed, time spent, and features used.</li>
            <li><strong>Location Data:</strong> General location information based on IP address.</li>
            <li><strong>Cookies and Similar Technologies:</strong> We use cookies and similar tracking technologies to enhance your experience and collect information about how you use our platform.</li>
          </ul>
          
          <h2>3. How We Use Your Information</h2>
          <p>We use the information we collect for various purposes, including to:</p>
          <ul>
            <li>Provide, maintain, and improve our platform and services</li>
            <li>Process and complete transactions</li>
            <li>Personalize your experience and deliver relevant content</li>
            <li>Send you technical notices, updates, security alerts, and support messages</li>
            <li>Respond to your comments, questions, and requests</li>
            <li>Monitor and analyze trends, usage, and activities in connection with our platform</li>
            <li>Detect, investigate, and prevent fraudulent transactions and other illegal activities</li>
            <li>Protect the rights and property of BOS and others</li>
          </ul>
          
          <h2>4. Sharing of Information</h2>
          <p>We may share your information with the following parties and in the following circumstances:</p>
          
          <h3>4.1 With Other Users</h3>
          <p>
            The content and information you share on our platform, such as your profile information, posts, and comments, will be visible to other users according to your privacy settings.
          </p>
          
          <h3>4.2 With Service Providers</h3>
          <p>
            We may share your information with third-party vendors, consultants, and other service providers who need access to your information to perform services on our behalf.
          </p>
          
          <h3>4.3 For Legal Reasons</h3>
          <p>
            We may disclose your information if we believe it is necessary to:
          </p>
          <ul>
            <li>Comply with applicable laws, regulations, legal processes, or governmental requests</li>
            <li>Enforce our Terms of Service, including investigating potential violations</li>
            <li>Detect, prevent, or address fraud, security, or technical issues</li>
            <li>Protect against harm to the rights, property, or safety of BOS, our users, or the public</li>
          </ul>
          
          <h2>5. Data Security</h2>
          <p>
            We implement appropriate technical and organizational measures to protect the security of your personal information. However, no electronic transmission or storage system is 100% secure, and we cannot guarantee absolute security.
          </p>
          
          <h2>6. Your Rights and Choices</h2>
          <p>Depending on your location, you may have the following rights regarding your personal information:</p>
          <ul>
            <li>Access, update, or delete your personal information</li>
            <li>Object to or restrict our processing of your personal information</li>
            <li>Data portability (receive your data in a structured, commonly used format)</li>
            <li>Withdraw consent where processing is based on consent</li>
          </ul>
          <p>
            To exercise these rights, please contact us at <a href="mailto:privacy@bos.com" className="text-primary hover:underline">privacy@bos.com</a>.
          </p>
          
          <h2>7. Terms Acceptance</h2>
          <p>
            When you sign up for our platform, you are required to accept our terms and conditions. The date of acceptance and version of the terms are recorded to ensure proper record-keeping and compliance.
          </p>
          
          <h2>8. Children's Privacy</h2>
          <p>
            Our platform is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If you believe we have collected information from a child under 13, please contact us immediately.
          </p>
          
          <h2>9. International Data Transfers</h2>
          <p>
            Your information may be transferred to and processed in countries other than the country in which you reside. These countries may have different data protection laws than your country of residence.
          </p>
          
          <h2>10. Changes to This Privacy Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. The updated version will be indicated by an updated "Last Updated" date. We encourage you to review this Privacy Policy frequently to stay informed about how we are protecting your information.
          </p>
          
          <h2>11. Contact Us</h2>
          <p>
            If you have any questions or concerns about this Privacy Policy or our privacy practices, please contact us at <a href="mailto:privacy@bos.com" className="text-primary hover:underline">privacy@bos.com</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
