'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RoadmatesPosts } from "./RoadmatesPosts";
import { YourPosts } from "./YourPosts";

interface PostsProps {
  isPublicProfile?: boolean;
}

export function Posts({ isPublicProfile = false }: PostsProps) {
  return (
    <div className="h-full flex flex-col">
      <Tabs defaultValue="roadmates" className="h-full flex flex-col">
        <TabsList className="grid w-full grid-cols-2 bg-background/50 backdrop-blur-sm sticky top-0 z-10">
          <TabsTrigger value="roadmates">Roadmates</TabsTrigger>
          <TabsTrigger value="yours">Yours</TabsTrigger>
        </TabsList>
        
        <TabsContent value="roadmates" className="flex-1 overflow-y-auto">
          <RoadmatesPosts />
        </TabsContent>
        
        <TabsContent value="yours" className="flex-1 overflow-y-auto">
          <YourPosts isPublicProfile={isPublicProfile} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
