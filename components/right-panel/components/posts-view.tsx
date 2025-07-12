import { RightPanelView } from '../right-panel';

export function PostsView() {
  return (
    <RightPanelView view="posts">
      <div className="space-y-4">
        <h3 className="font-medium">Recent Posts</h3>
        <div className="space-y-3">
          {/* Example post items */}
          <div className="p-3 border rounded-lg hover:bg-muted/50 transition-colors">
            <h4 className="font-medium text-sm">Post Title</h4>
            <p className="text-sm text-muted-foreground line-clamp-2">
              This is a preview of the post content. Click to read more...
            </p>
          </div>
        </div>
      </div>
    </RightPanelView>
  );
}
