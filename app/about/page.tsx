'use client';

import { ChevronLeft, Linkedin, Github, Mail } from "lucide-react";
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
            <p className="text-lg leading-relaxed">
              BOS is a cutting-edge platform designed to help individuals and teams define, track, and achieve their goals through structured roadmaps and meaningful connections. We combine the power of goal-setting methodology with intelligent matching algorithms to create a supportive ecosystem for personal and professional development.
            </p>
          </section>
          
          <section className="mb-10">
            <h2>Our Story</h2>
            <p className="mb-4">
              In 2025, Homayoun Asghari identified a critical gap in the market for goal achievement tools. While project management software provided structure, it lacked the human element of support and accountability. Social platforms offered connection but without the necessary structure for meaningful progress.
            </p>
            <p>
              After extensive research and development, BOS was born—a platform that seamlessly integrates structured goal-setting with community support, powered by advanced algorithms that connect users with like-minded individuals on similar journeys.
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
            <p className="max-w-2xl">
              Currently, BOS is built and maintained by a solo founder with a vision to help people achieve their goals through innovative technology and thoughtful design. We look forward to expanding our team in the near future to better serve our growing community.
            </p>
            <div className="flex justify-center my-8">
              <div className="text-center group">
                <div className="w-32 h-32 rounded-full overflow-hidden mx-auto mb-4 border-2 border-primary/20 group-hover:border-primary/50 transition-all duration-300">
                  <Image 
                    src="/347748+8.jpg" 
                    alt="Homayoun Asghari"
                    width={128}
                    height={128}
                    className="w-full h-full object-cover"
                    priority
                  />
                </div>
                <h3 className="text-lg font-medium">Homayoun Asghari</h3>
                <p className="text-sm text-muted-foreground mb-2">Founder & Lead Developer</p>
                <div className="flex justify-center space-x-3 mt-2">
                  <a href="https://www.linkedin.com/in/homayoun-asghari-b9769912a/" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                    <Linkedin className="h-5 w-5" />
                  </a>
                  <a href="https://github.com/homayoun-asghari" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                    <Github className="h-5 w-5" />
                  </a>
                  <a href="mailto:asghari.homayoun@yahoo.com" className="text-muted-foreground hover:text-primary transition-colors">
                    <Mail className="h-5 w-5" />
                  </a>
                </div>
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
              We&apos;re just getting started, and we&apos;d love for you to join us. Create your account today and start mapping out your journey, 
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
