'use client';

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import './page-styles.css';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background pt-8 pb-16 overflow-y-auto" style={{ height: '100vh', overflowY: 'auto' }}>
      <div className="container max-w-3xl mx-auto px-4">
        <div className="mb-8">
          <Link href="/" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="h-4 w-4" />
            Back to home
          </Link>
        </div>
        
        <h1 className="text-3xl font-bold mb-8">Terms of Service</h1>
        
        <div className="prose dark:prose-invert max-w-none">
          <p className="text-sm text-muted-foreground mb-4">Last updated: July 29, 2025</p>
          
          <h2>1. Introduction</h2>
          <p>
            Welcome to BOS. These Terms of Service (&quot;Terms&quot;) govern your use of our website, applications, and services (collectively, the &quot;Service&quot;). 
            By accessing or using the Service, you agree to be bound by these Terms.
          </p>
          
          <h2>2. Definitions</h2>
          <p>
            &quot;Service&quot; refers to the BOS platform, including all content, features, and functionality offered.
            &quot;User&quot;, &quot;you&quot;, and &quot;your&quot; refers to the individual or entity using our Service.
            &quot;Content&quot; includes text, images, videos, audio, and other materials shared or accessed through the Service.
          </p>
          
          <h2>3. Account Registration</h2>
          <p>
            To use certain features of the Service, you must register for an account. You agree to provide accurate and complete information when creating your account and to keep this information updated. 
            You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.
          </p>
          
          <h2>4. User Conduct</h2>
          <p>You agree not to:</p>
          <ul>
            <li>Use the Service for any illegal purpose or in violation of any laws</li>
            <li>Post or transmit harmful, inappropriate, or illegal content</li>
            <li>Impersonate others or misrepresent your affiliation with any person or entity</li>
            <li>Attempt to gain unauthorized access to the Service or other users&apos; accounts</li>
            <li>Interfere with or disrupt the Service or servers or networks connected to the Service</li>
            <li>Collect or store personal data about other users without their consent</li>
            <li>Use the Service in a manner that may create a conflict of interest</li>
          </ul>
          
          <h2>5. Content</h2>
          <p>
            You retain ownership of any content you post on the Service. By posting content, you grant us a non-exclusive, transferable, sublicensable, royalty-free, worldwide license to use, modify, publicly display, and distribute such content on and through the Service.
          </p>
          <p>
            We do not claim ownership of your content, but you grant us permission to use it for operating and improving the Service. You represent and warrant that you own or have the necessary rights to the content you post and that your content does not violate the rights of any third party.
          </p>
          
          <h2>6. Intellectual Property</h2>
          <p>
            The Service and its original content, features, and functionality are owned by BOS and are protected by copyright, trademark, and other intellectual property laws. You may not copy, modify, create derivative works from, or otherwise exploit our intellectual property without our express permission.
          </p>
          
          <h2>7. Privacy</h2>
          <p>
            Your privacy is important to us. Please review our <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>, which explains how we collect, use, and share information about you.
          </p>
          
          <h2>8. Termination</h2>
          <p>
            We may terminate or suspend your account and access to the Service at any time, without prior notice or liability, for any reason, including if you breach these Terms. Upon termination, your right to use the Service will immediately cease.
          </p>
          
          <h2>9. Disclaimer of Warranties</h2>
          <p>
            The Service is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind, either express or implied, including, but not limited to, implied warranties of merchantability, fitness for a particular purpose, non-infringement, or course of performance.
          </p>
          
          <h2>10. Limitation of Liability</h2>
          <p>
            In no event shall BOS, its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the Service.
          </p>
          
          <h2>11. Changes to Terms</h2>
          <p>
            We may revise these Terms from time to time. The most current version will always be posted on our website. By continuing to access or use the Service after those revisions become effective, you agree to be bound by the revised Terms.
          </p>
          
          <h2>12. Governing Law</h2>
          <p>
            These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which BOS is established, without regard to its conflict of law provisions.
          </p>
          
          <h2>13. Contact</h2>
          <p>
            If you have any questions about these Terms, please contact us at <a href="mailto:support@bos.com" className="text-primary hover:underline">support@bos.com</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
