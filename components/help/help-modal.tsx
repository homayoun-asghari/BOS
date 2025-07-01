'use client';

import { useState } from 'react';
import { BookOpen, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type Article = {
  id: string;
  title: string;
  content: string;
};

type Chapter = {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  articles: Article[];
};

interface HelpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HelpModal({ open, onOpenChange }: HelpModalProps) {
  const [selectedChapter, setSelectedChapter] = useState<string | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);

  // Sample data - replace with your actual help content
  const chapters: Chapter[] = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      icon: BookOpen,
      articles: [
        {
          id: 'welcome',
          title: 'Welcome to Our App',
          content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam in dui mauris. Vivamus hendrerit arcu sed erat molestie vehicula. Sed auctor neque eu tellus rhoncus ut eleifend nibh porttitor.'
        },
        {
          id: 'first-steps',
          title: 'First Steps',
          content: 'Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia Curae; In ac dui quis mi consectetuer lacinia. Nam pretium turpis et arcu.'
        }
      ]
    },
    {
      id: 'features',
      title: 'Features',
      icon: BookOpen,
      articles: [
        {
          id: 'dashboard',
          title: 'Using the Dashboard',
          content: 'Aenean commodo ligula eget dolor. Aenean massa. Cum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus.'
        },
        {
          id: 'settings',
          title: 'Customizing Settings',
          content: 'Donec quam felis, ultricies nec, pellentesque eu, pretium quis, sem. Nulla consequat massa quis enim. Donec pede justo, fringilla vel, aliquet nec, vulputate eget, arcu.'
        }
      ]
    }
  ];


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[80vh] flex p-0 overflow-hidden">
        <div className="w-64 border-r p-6 overflow-y-auto">
          <DialogHeader className="mb-6 px-0">
            <DialogTitle className="text-lg font-semibold">
              Help Center
            </DialogTitle>
          </DialogHeader>
          
          {!selectedChapter ? (
            <div className="space-y-1">
              {chapters.map((chapter) => (
                <div 
                  key={chapter.id}
                  className="p-2 rounded-md hover:bg-accent cursor-pointer"
                  onClick={() => setSelectedChapter(chapter.id)}
                >
                  <div className="flex items-center">
                    <chapter.icon className="h-4 w-4 mr-3 text-muted-foreground" />
                    <span className="text-sm font-medium">{chapter.title}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              <button 
                onClick={() => setSelectedChapter(null)}
                className="w-full flex items-center p-2 text-left text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back to Chapters
              </button>
              
              {chapters
                .find(c => c.id === selectedChapter)
                ?.articles.map((article) => (
                  <div 
                    key={article.id}
                    className="p-2 rounded-md hover:bg-accent cursor-pointer"
                    onClick={() => setSelectedArticle(article)}
                  >
                    <h3 className="text-sm font-medium">{article.title}</h3>
                  </div>
                ))}
            </div>
          )}
        </div>
        
        <div className="flex-1 flex flex-col overflow-hidden">
          <DialogHeader className="border-b p-6">
            <DialogTitle className="text-lg font-semibold">
              {selectedArticle?.title || 
               chapters.find(c => c.id === selectedChapter)?.title || 
               'Welcome to Help Center'}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 p-6 overflow-y-auto">
            {selectedArticle ? (
              <div className="prose dark:prose-invert max-w-3xl">
                <p className="text-muted-foreground text-sm mb-6">
                  {chapters.find(c => c.articles.some(a => a.id === selectedArticle.id))?.title}
                </p>
                <h2 className="text-2xl font-semibold mb-6">{selectedArticle.title}</h2>
                <div className="space-y-4 text-foreground">
                  <p>{selectedArticle.content}</p>
                  <p>
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam in dui mauris. 
                    Vivamus hendrerit arcu sed erat molestie vehicula. Sed auctor neque eu tellus 
                    rhoncus ut eleifend nibh porttitor.
                  </p>
                  <p>
                    Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia 
                    Curae; In ac dui quis mi consectetuer lacinia. Nam pretium turpis et arcu.
                  </p>
                </div>
              </div>
            ) : selectedChapter ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8">
                <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
                <h2 className="text-xl font-semibold mb-2">Select an article</h2>
                <p className="text-muted-foreground max-w-md">
                  Choose an article from the sidebar to view its content.
                </p>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-8">
                <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
                <h2 className="text-xl font-semibold mb-2">How can we help you?</h2>
                <p className="text-muted-foreground max-w-md mb-6">
                  Browse our help articles to find answers to common questions and learn how to get the most out of our platform.
                </p>
                <div className="grid grid-cols-2 gap-4 mt-4 w-64">
                  {chapters.map((chapter) => (
                    <Button
                      key={chapter.id}
                      variant="outline"
                      className="h-auto py-3 flex-col items-start"
                      onClick={() => setSelectedChapter(chapter.id)}
                    >
                      <chapter.icon className="h-5 w-5 mb-2 text-muted-foreground" />
                      <span className="font-medium">{chapter.title}</span>
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
