'use client';

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import './page-styles.css';

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-background pt-8 pb-16 overflow-y-auto" style={{ height: '100vh', overflowY: 'auto' }}>
      <div className="container max-w-3xl mx-auto px-4">
        <div className="mb-8">
          <Link href="/" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="h-4 w-4" />
            Back to home
          </Link>
        </div>
        
        <h1 className="text-3xl font-bold mb-8">Contact Us</h1>
        
        <div className="prose dark:prose-invert max-w-none mb-10">
          <p>
            We're here to help! If you have questions, feedback, or need assistance with BOS, 
            please use the form below or reach out to us directly using the contact information provided.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div>
            <form className="space-y-6">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium">
                  Name
                </label>
                <Input id="name" placeholder="Your name" />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  Email
                </label>
                <Input id="email" type="email" placeholder="your.email@example.com" />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="subject" className="text-sm font-medium">
                  Subject
                </label>
                <Input id="subject" placeholder="How can we help?" />
              </div>
              
              <div className="space-y-2">
                <label htmlFor="message" className="text-sm font-medium">
                  Message
                </label>
                <Textarea id="message" placeholder="Please describe your issue or question in detail" rows={5} />
              </div>
              
              <Button type="submit" className="w-full">
                Send Message
              </Button>
            </form>
          </div>
          
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-semibold mb-3">Email</h3>
              <p className="text-muted-foreground">
                <a href="mailto:support@bos.com" className="text-primary hover:underline">
                  support@bos.com
                </a>
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-3">Office</h3>
              <address className="not-italic text-muted-foreground">
                123 Tech Avenue<br />
                Suite 200<br />
                San Francisco, CA 94107<br />
                United States
              </address>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-3">Hours of Operation</h3>
              <p className="text-muted-foreground">
                Monday - Friday: 9:00 AM - 6:00 PM PST<br />
                Saturday & Sunday: Closed
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-3">Follow Us</h3>
              <div className="flex space-x-4">
                <a href="https://twitter.com/bos" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">
                  Twitter
                </a>
                <a href="https://linkedin.com/company/bos" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">
                  LinkedIn
                </a>
                <a href="https://github.com/bos" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary">
                  GitHub
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
