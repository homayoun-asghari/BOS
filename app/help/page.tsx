'use client';

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import './page-styles.css';

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-background pt-8 pb-16 overflow-y-auto" style={{ height: '100vh', overflowY: 'auto' }}>
      <div className="container max-w-3xl mx-auto px-4">
        <div className="mb-8">
          <Link href="/" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="h-4 w-4" />
            Back to home
          </Link>
        </div>
        
        <h1 className="text-3xl font-bold mb-8">Help Center</h1>
        
        <div className="prose dark:prose-invert max-w-none">
          <section className="mb-10">
            <h2>Getting Started</h2>
            <p>
              Welcome to BOS Help Center. Here you'll find resources to help you navigate and get the most out of our platform.
            </p>
            <h3>Creating Your Account</h3>
            <p>
              To start using BOS, you'll need to create an account. Click on the Sign Up button on our homepage and follow the instructions. 
              You'll need to verify your email before you can access all features.
            </p>
            <h3>Setting Up Your Profile</h3>
            <p>
              Once your account is created, complete your profile by adding a profile picture, bio, and linking your other social accounts.
              A complete profile helps others connect with you and understand your journey.
            </p>
          </section>
          
          <section className="mb-10">
            <h2>Creating Roadmaps</h2>
            <p>
              Roadmaps are at the heart of BOS, helping you plan and track your progress toward your goals.
            </p>
            <h3>How to Create a Roadmap</h3>
            <ol>
              <li>Navigate to your profile page</li>
              <li>Click on the Roadmaps tab</li>
              <li>Click on "Create New Roadmap"</li>
              <li>Fill in the required information</li>
              <li>Add milestones and tasks to structure your journey</li>
              <li>Choose whether you want to make your roadmap public or private</li>
              <li>Save your roadmap</li>
            </ol>
            <h3>Managing Milestones and Tasks</h3>
            <p>
              Break down your roadmap into manageable milestones, and further into specific tasks. 
              This helps you track progress and stay organized.
            </p>
          </section>
          
          <section className="mb-10">
            <h2>Connecting with Others</h2>
            <p>
              BOS is a social platform designed to help you connect with others on similar journeys.
            </p>
            <h3>Finding Similar Users</h3>
            <p>
              Our similarity matching engine will suggest users who are on similar paths. 
              You can find these recommendations in the "Roadmates" tab.
            </p>
            <h3>Messaging</h3>
            <p>
              To start a conversation with another user, visit their profile and click on the message icon. 
              You can access all your conversations from the messages section.
            </p>
          </section>
          
          <section className="mb-10">
            <h2>Privacy Settings</h2>
            <p>
              Control who can see your content and how you appear to others on the platform.
            </p>
            <h3>Adjusting Privacy</h3>
            <p>
              Access your privacy settings from your profile menu. You can control:
            </p>
            <ul>
              <li>Who can see your roadmaps</li>
              <li>Who can see your posts</li>
              <li>Who can send you messages</li>
              <li>Whether your profile appears in search results</li>
            </ul>
          </section>
          
          <section>
            <h2>Need More Help?</h2>
            <p>
              If you can't find the answers you're looking for, please <Link href="/contact" className="text-primary hover:underline">contact our support team</Link>. 
              We're here to help you make the most of your BOS experience.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
