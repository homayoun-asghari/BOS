"use client";

import { MoreVertical, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { deletePost } from "@/lib/supabase/posts";
import { deletePostMedia } from "@/lib/supabase/storage-utils";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface PostMenuProps {
  postId: string;
  mediaUrls?: (string | { path: string })[] | null;
  isOwner: boolean;
  onDeleted?: () => void;
}

export function PostMenu({ postId, mediaUrls, isOwner, onDeleted }: PostMenuProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  if (!isOwner) return null;

  const handleDelete = async () => {
    if (loading) return;
    
    setLoading(true);
    try {
      // Delete from DB
      await deletePost(postId);

      // Delete any media files
      if (Array.isArray(mediaUrls)) {
        const paths = mediaUrls.map((m) => (typeof m === "string" ? m : m.path)).filter(Boolean);
        for (const p of paths) {
          await deletePostMedia(p);
        }
      }

      toast.success("Post deleted");
      onDeleted?.();
      // Redirect to Yours tab
      router.push("/right-panel?tab=yours");
    } catch (error) {
      console.error("Error deleting post:", error);
      toast.error("Failed to delete post");
    } finally {
      setLoading(false);
      setShowDeleteDialog(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="p-2 rounded-full bg-black/30 hover:bg-black/40 text-white focus:outline-none">
          <MoreVertical className="w-5 h-5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" >
          <DropdownMenuItem 
            onClick={() => setShowDeleteDialog(true)} 
            className="flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Delete Post
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Post</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this post? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button 
              variant="outline" 
              onClick={() => setShowDeleteDialog(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleDelete}
              disabled={loading}
            >
              {loading ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
