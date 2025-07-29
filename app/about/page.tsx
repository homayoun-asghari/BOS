'use client';

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import './page-styles.css';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background pt-8 pb-16 overflow-y-auto" style={{ height: '100vh', overflowY: 'auto' }}>
      <div className="container max-w-3xl mx-auto px-4">
        <div className="mb-8">
          <Link href="/" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="h-4 w-4" />
            Back to home
          </Link>
        </div>
        
        <h1 className="text-3xl font-bold mb-8">About BOS</h1>
        
        <div className="prose dark:prose-invert max-w-none">
          <section className="mb-10">
            <h2>Our Mission</h2>
            <p>
              At BOS, we're building a platform that helps people define, track, and achieve their goals while connecting with others on similar journeys. 
              We believe that structured progress tracking combined with community support creates the ideal environment for personal and professional growth.
            </p>
          </section>
          
          <section className="mb-10">
            <h2>Our Story</h2>
            <p>
              BOS was founded in 2024 by a team of developers, designers, and productivity enthusiasts who were frustrated with existing tools. 
              We wanted to create something that combined the structure of project management software with the supportive nature of social networks.
            </p>
            <p>
              After months of development and testing with early users, we launched our platform to help people define their roadmaps, break them down into achievable milestones, 
              and connect with others who are on similar paths.
            </p>
          </section>
          
          <section className="mb-10">
            <h2>What Makes Us Different</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-6">
              <div className="bg-muted/30 p-6 rounded-lg">
                <h3>Vector Similarity Matching</h3>
                <p>
                  Our proprietary algorithm helps you find people who are on similar journeys, creating opportunities for mentorship, collaboration, and support.
                </p>
              </div>
              <div className="bg-muted/30 p-6 rounded-lg">
                <h3>Structured Progress Tracking</h3>
                <p>
                  Break down your goals into roadmaps, milestones, and tasks, making it easier to track your progress and celebrate your achievements.
                </p>
              </div>
              <div className="bg-muted/30 p-6 rounded-lg">
                <h3>Community-Driven Support</h3>
                <p>
                  Connect with a community of like-minded individuals who can provide feedback, encouragement, and accountability.
                </p>
              </div>
              <div className="bg-muted/30 p-6 rounded-lg">
                <h3>Privacy-Focused Design</h3>
                <p>
                  You control what you share and with whom, ensuring that your data and progress remain private when you want them to be.
                </p>
              </div>
            </div>
          </section>
          
          <section className="mb-10">
            <h2>Our Team</h2>
            <p>
              BOS is built by a small but dedicated team of professionals committed to helping people achieve their goals.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 my-6">
              <div className="text-center">
                <div className="w-24 h-24 rounded-full bg-muted mx-auto mb-3"></div>
                <h3 className="text-lg font-medium">Alex Chen</h3>
                <p className="text-sm text-muted-foreground">Founder & CEO</p>
              </div>
              <div className="text-center">
                <div className="w-24 h-24 rounded-full bg-muted mx-auto mb-3"></div>
                <h3 className="text-lg font-medium">Sarah Johnson</h3>
                <p className="text-sm text-muted-foreground">Chief Product Officer</p>
              </div>
              <div className="text-center">
                <div className="w-24 h-24 rounded-full bg-muted mx-auto mb-3"></div>
                <h3 className="text-lg font-medium">Michael Brown</h3>
                <p className="text-sm text-muted-foreground">Lead Developer</p>
              </div>
            </div>
          </section>
          
          <section className="mb-10">
            <h2>Our Values</h2>
            <ul>
              <li><strong>Transparency:</strong> We believe in being open about how our platform works and how we use your data.</li>
              <li><strong>Growth Mindset:</strong> We encourage continuous learning and improvement, both for our users and our team.</li>
              <li><strong>Community:</strong> We foster a supportive environment where people can learn from and inspire each other.</li>
              <li><strong>Privacy:</strong> We respect your data and give you control over what you share.</li>
              <li><strong>Simplicity:</strong> We strive to make our platform intuitive and easy to use, focusing on what matters most.</li>
            </ul>
          </section>
          
          <section>
            <h2>Join Us on This Journey</h2>
            <p>
              We're just getting started, and we'd love for you to join us. Create your account today and start mapping out your journey, 
              connecting with others, and tracking your progress toward your goals.
            </p>
            <div className="flex justify-center mt-8">
              <Link href="/" className="bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-3 rounded-md font-medium">
                Get Started Now
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
