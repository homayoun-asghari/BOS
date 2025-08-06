
```
BOS
├─ app
│  ├─ LayoutWrapper.tsx
│  ├─ PageWrapper.tsx
│  ├─ about
│  │  ├─ page-styles.css
│  │  └─ page.tsx
│  ├─ actions
│  ├─ api
│  │  ├─ delete-cover
│  │  └─ storage
│  │     └─ signed-url
│  ├─ chat
│  ├─ contact
│  │  ├─ page-styles.css
│  │  └─ page.tsx
│  ├─ favicon.ico
│  ├─ globals.css
│  ├─ help
│  │  ├─ page-styles.css
│  │  └─ page.tsx
│  ├─ journal
│  │  └─ page.tsx
│  ├─ knowledge
│  │  ├─ mockData.ts
│  │  └─ page.tsx
│  ├─ layout.tsx
│  ├─ not-found.tsx
│  ├─ notes
│  │  ├─ [id]
│  │  │  └─ page.tsx
│  │  ├─ layout.tsx
│  │  ├─ new
│  │  │  └─ page.tsx
│  │  └─ page.tsx
│  ├─ page.tsx
│  ├─ privacy
│  │  ├─ page-styles.css
│  │  └─ page.tsx
│  ├─ right-panel
│  │  ├─ layout.tsx
│  │  └─ page.tsx
│  ├─ roadmap
│  │  └─ page.tsx
│  ├─ terms
│  │  ├─ page-styles.css
│  │  └─ page.tsx
│  ├─ test
│  │  └─ storage
│  └─ upgrade
│     └─ page.tsx
├─ components
│  ├─ TestLinks.tsx
│  ├─ animated
│  │  └─ AnimatedHero.tsx
│  ├─ auth
│  │  ├─ AuthModal.tsx
│  │  └─ AuthProvider.tsx
│  ├─ chat
│  │  ├─ chat-header.tsx
│  │  ├─ chat-view.tsx
│  │  ├─ conversation-item.tsx
│  │  ├─ conversation-list.tsx
│  │  ├─ message-input.tsx
│  │  └─ message-item.tsx
│  ├─ dashboard
│  │  ├─ BackupRoadmapTimeline.tsx
│  │  ├─ CustomTaskNode.tsx
│  │  ├─ DashboardActionButton.tsx
│  │  ├─ EnhancedRoadmapTimeline.tsx
│  │  ├─ RoadmapHeader.tsx
│  │  ├─ roadmap-posts-sheet.tsx
│  │  └─ roadmap-visualization.tsx
│  ├─ editor
│  │  ├─ FileUploadButton.tsx
│  │  ├─ ImageWithSignedUrl.tsx
│  │  ├─ InlineTagInput.tsx
│  │  ├─ MinimalEditorWrapper.tsx
│  │  ├─ NewTipTapEditor.tsx
│  │  ├─ TagSuggestions.tsx
│  │  ├─ extensions
│  │  ├─ hooks
│  │  │  ├─ useAttachmentCleaner.ts
│  │  │  ├─ useEditorLifecycle.ts
│  │  │  ├─ useFileUploads.ts
│  │  │  └─ usePendingLinks.ts
│  │  ├─ minimal-tiptap
│  │  │  ├─ components
│  │  │  │  ├─ bubble-menu
│  │  │  │  │  ├─ index.ts
│  │  │  │  │  └─ link-bubble-menu.tsx
│  │  │  │  ├─ image
│  │  │  │  │  ├─ image-edit-block.tsx
│  │  │  │  │  ├─ image-edit-dialog.tsx
│  │  │  │  │  └─ index.ts
│  │  │  │  ├─ index.ts
│  │  │  │  ├─ link
│  │  │  │  │  ├─ index.ts
│  │  │  │  │  ├─ link-edit-block.tsx
│  │  │  │  │  ├─ link-edit-popover.tsx
│  │  │  │  │  ├─ link-popover-block.tsx
│  │  │  │  │  └─ note-search.tsx
│  │  │  │  ├─ measured-container.tsx
│  │  │  │  ├─ section
│  │  │  │  │  ├─ five.tsx
│  │  │  │  │  ├─ four.tsx
│  │  │  │  │  ├─ index.ts
│  │  │  │  │  ├─ one.tsx
│  │  │  │  │  ├─ three.tsx
│  │  │  │  │  └─ two.tsx
│  │  │  │  ├─ shortcut-key.tsx
│  │  │  │  ├─ spinner.tsx
│  │  │  │  ├─ toolbar-button.tsx
│  │  │  │  └─ toolbar-section.tsx
│  │  │  ├─ editor.tsx
│  │  │  ├─ extensions
│  │  │  │  ├─ InlineTagExtension.tsx
│  │  │  │  ├─ code-block-lowlight
│  │  │  │  │  ├─ code-block-lowlight.ts
│  │  │  │  │  └─ index.ts
│  │  │  │  ├─ collapsible-heading
│  │  │  │  │  └─ collapsible-heading.tsx
│  │  │  │  ├─ color
│  │  │  │  │  ├─ color.ts
│  │  │  │  │  └─ index.ts
│  │  │  │  ├─ file-handler
│  │  │  │  │  └─ index.ts
│  │  │  │  ├─ highlight
│  │  │  │  │  └─ highlight.ts
│  │  │  │  ├─ horizontal-rule
│  │  │  │  │  ├─ horizontal-rule.ts
│  │  │  │  │  └─ index.ts
│  │  │  │  ├─ image
│  │  │  │  │  ├─ components
│  │  │  │  │  │  ├─ image-actions.tsx
│  │  │  │  │  │  ├─ image-overlay.tsx
│  │  │  │  │  │  ├─ image-view-block.tsx
│  │  │  │  │  │  └─ resize-handle.tsx
│  │  │  │  │  ├─ hooks
│  │  │  │  │  │  ├─ use-drag-resize.ts
│  │  │  │  │  │  └─ use-image-actions.ts
│  │  │  │  │  ├─ image.ts
│  │  │  │  │  └─ index.ts
│  │  │  │  ├─ index.ts
│  │  │  │  ├─ inline-tag
│  │  │  │  ├─ link
│  │  │  │  │  ├─ index.ts
│  │  │  │  │  └─ link.ts
│  │  │  │  ├─ reset-marks-on-enter
│  │  │  │  │  ├─ index.ts
│  │  │  │  │  └─ reset-marks-on-enter.ts
│  │  │  │  ├─ selection
│  │  │  │  │  ├─ index.ts
│  │  │  │  │  └─ selection.ts
│  │  │  │  └─ unset-all-marks
│  │  │  │     ├─ index.ts
│  │  │  │     └─ unset-all-marks.ts
│  │  │  ├─ hooks
│  │  │  │  ├─ index.ts
│  │  │  │  ├─ use-container-size.ts
│  │  │  │  ├─ use-minimal-tiptap.ts
│  │  │  │  ├─ use-theme.ts
│  │  │  │  └─ use-throttle.ts
│  │  │  ├─ index.ts
│  │  │  ├─ minimal-tiptap.tsx
│  │  │  ├─ sections
│  │  │  ├─ styles
│  │  │  │  ├─ index.css
│  │  │  │  └─ partials
│  │  │  │     ├─ code.css
│  │  │  │     ├─ lists.css
│  │  │  │     ├─ placeholder.css
│  │  │  │     ├─ typography.css
│  │  │  │     └─ zoom.css
│  │  │  ├─ types.ts
│  │  │  └─ utils.ts
│  │  └─ styles
│  ├─ help
│  │  └─ help-modal.tsx
│  ├─ journal
│  │  └─ JournalDatePicker.tsx
│  ├─ knowledge
│  │  ├─ KnowledgeGraph.tsx
│  │  └─ styles
│  ├─ layout
│  │  ├─ TheCode.tsx
│  │  ├─ UserMenu.tsx
│  │  ├─ navbar.tsx
│  │  └─ sidebar.tsx
│  ├─ notes
│  │  ├─ NoteCard.tsx
│  │  ├─ NoteForm.tsx
│  │  └─ NoteList.tsx
│  ├─ posts
│  │  ├─ CreatePostModal.tsx
│  │  ├─ ImagePost.tsx
│  │  ├─ LikeButton.tsx
│  │  ├─ PostMenu.tsx
│  │  ├─ ShareButton.tsx
│  │  ├─ TextPost.tsx
│  │  ├─ VideoPost.tsx
│  │  ├─ VoicePost.tsx
│  │  ├─ display
│  │  │  ├─ ImageDisplay.tsx
│  │  │  ├─ PostDisplayProps.ts
│  │  │  ├─ PostThumbnail.tsx
│  │  │  ├─ TextDisplay.backup.tsx
│  │  │  ├─ TextDisplay.tsx
│  │  │  ├─ TimelineOverlay.tsx
│  │  │  ├─ VideoDisplay.tsx
│  │  │  └─ VoiceDisplay.tsx
│  │  ├─ dummy-posts.ts
│  │  └─ types
│  │     └─ post.types.ts
│  ├─ pricing
│  │  └─ pricing-card.tsx
│  ├─ profile
│  │  ├─ UserProfile.tsx
│  │  └─ mock-user-data.ts
│  ├─ providers
│  ├─ right-panel
│  │  ├─ components
│  │  │  ├─ chat
│  │  │  ├─ home
│  │  │  │  ├─ HistorySection.tsx
│  │  │  │  ├─ StatsSection.tsx
│  │  │  │  └─ index.tsx
│  │  │  ├─ posts
│  │  │  │  ├─ PostDetail.tsx
│  │  │  │  ├─ RoadmatesPosts.tsx
│  │  │  │  ├─ YourPosts.tsx
│  │  │  │  └─ index.tsx
│  │  │  ├─ posts-view.tsx
│  │  │  ├─ search
│  │  │  └─ stats-view.tsx
│  │  ├─ context
│  │  │  └─ right-panel-context.tsx
│  │  ├─ hooks
│  │  ├─ index.ts
│  │  ├─ right-panel.tsx
│  │  └─ types
│  │     └─ right-panel.types.ts
│  ├─ roadmap
│  │  ├─ CoverImageUpload.tsx
│  │  ├─ GoalSection.tsx
│  │  ├─ MilestoneItem.tsx
│  │  ├─ TaskItem.tsx
│  │  ├─ cover-image-upload.tsx
│  │  └─ roadmap-modal.tsx
│  ├─ settings
│  │  ├─ AvatarUploader.tsx
│  │  └─ settings-modal.tsx
│  ├─ theme
│  │  ├─ ThemeProvider.tsx
│  │  └─ ThemeToggle.tsx
│  ├─ ui
│  │  ├─ ToolbarButton.tsx
│  │  ├─ alert.tsx
│  │  ├─ avatar.tsx
│  │  ├─ badge.tsx
│  │  ├─ button.tsx
│  │  ├─ calendar.tsx
│  │  ├─ card.tsx
│  │  ├─ checkbox.tsx
│  │  ├─ date-picker.tsx
│  │  ├─ dialog.tsx
│  │  ├─ dropdown-menu.tsx
│  │  ├─ input.tsx
│  │  ├─ label.tsx
│  │  ├─ popover.tsx
│  │  ├─ scroll-area.tsx
│  │  ├─ select.tsx
│  │  ├─ separator.tsx
│  │  ├─ skeleton.tsx
│  │  ├─ sonner.tsx
│  │  ├─ switch.tsx
│  │  ├─ tabs.tsx
│  │  ├─ textarea.tsx
│  │  ├─ toast.tsx
│  │  ├─ toaster.tsx
│  │  ├─ toggle-group.tsx
│  │  ├─ toggle.tsx
│  │  ├─ tooltip.tsx
│  │  └─ use-toast.tsx
│  └─ utils
│     ├─ ConsoleSilencer.tsx
│     └─ SearchParamsProvider.tsx
├─ components.json
├─ context
│  ├─ chat-context.tsx
│  ├─ mobile-right-panel-context.tsx
│  └─ profile-context.tsx
├─ contexts
│  └─ RefreshContext.tsx
├─ data
├─ eslint.config.mjs
├─ fix-imports.js
├─ hooks
│  ├─ use-chat.ts
│  ├─ use-right-panel.ts
│  ├─ use-user-profile.ts
│  ├─ useEditorUpload.ts
│  ├─ useLikeAnimation.ts
│  ├─ useNoteForm.ts
│  ├─ useNoteForm.ts.bak
│  ├─ useNoteLinks.ts
│  ├─ useNotes.ts
│  ├─ usePosts.ts
│  ├─ useProfileRoadmap.ts
│  ├─ useRoadmapData.ts
│  ├─ useRoadmapVector.ts
│  ├─ useShuffleSettings.ts
│  ├─ useTagSuggestions.ts
│  └─ useTags.ts
├─ jest.config.js
├─ jest.setup.js
├─ journals_rows.csv
├─ jsconfig.json
├─ lib
│  ├─ chatData.ts
│  ├─ context
│  ├─ editor
│  │  └─ attachments.ts
│  ├─ markdown.ts
│  ├─ roadmap
│  │  └─ roadmap-vector-service.ts
│  ├─ supabase
│  │  ├─ attachment-sync.ts
│  │  ├─ attachments.ts
│  │  ├─ chat-service.ts
│  │  ├─ client.ts
│  │  ├─ database.types.ts
│  │  ├─ editor-uploads.ts
│  │  ├─ notes.ts
│  │  ├─ posts.ts
│  │  ├─ profile-service.ts
│  │  ├─ services
│  │  │  ├─ knowledgeGraph.ts
│  │  │  ├─ linkService.ts
│  │  │  └─ tagService.ts
│  │  ├─ storage-utils.ts
│  │  └─ storage.ts
│  ├─ utils
│  │  ├─ date.ts
│  │  ├─ image-utils.ts
│  │  └─ roadmap-cover-utils.ts
│  └─ utils.ts
├─ migrations
├─ next.config.js
├─ next.config.ts
├─ package-lock.json
├─ package.json
├─ postcss.config.js
├─ postcss.config.mjs
├─ public
│  ├─ 347748+8.jpg
│  ├─ asset
│  │  └─ montain.png
│  ├─ file.svg
│  ├─ globe.svg
│  ├─ logo-dark
│  │  ├─ android-chrome-192x192.png
│  │  ├─ android-chrome-512x512.png
│  │  ├─ apple-touch-icon.png
│  │  ├─ favicon-16x16.png
│  │  ├─ favicon-32x32.png
│  │  ├─ favicon.ico
│  │  └─ site.webmanifest
│  ├─ logo-light
│  │  ├─ android-chrome-192x192.png
│  │  ├─ android-chrome-512x512.png
│  │  ├─ apple-touch-icon.png
│  │  ├─ favicon-16x16.png
│  │  ├─ favicon-32x32.png
│  │  ├─ favicon.ico
│  │  └─ site.webmanifest
│  ├─ next.svg
│  ├─ vercel.svg
│  └─ window.svg
├─ rules.md
├─ scripts
│  ├─ check-links.sql
│  ├─ check-rls.sql
│  ├─ create-debug-function.sql
│  ├─ simple-test.ts
│  ├─ test-roadmap-similarity.ts
│  └─ update-imports.js
├─ src
│  └─ components
│     └─ editor
├─ styles
│  ├─ search.css
│  └─ search.module.css
├─ supabase
│  └─ migrations
│     ├─ 20240101000004_create_chat_room_function.sql
│     ├─ 20240730162730_create_delete_user_function.sql
│     ├─ 20250717163153_check_posts_schema.sql
│     ├─ 20250718000000_get_direct_message_room.sql
│     ├─ 20250718000000_initial_schema.sql
│     ├─ 20250718000001_create_search_profiles_function.sql
│     ├─ 20250718000001_profiles_and_auth.sql
│     ├─ 20250718000002_create_chat_room_function.sql
│     ├─ 20250718000002_notes_and_search.sql
│     ├─ 20250718000003_profile_functions.sql
│     ├─ 20250718000003_tags_and_links.sql
│     ├─ 20250718000004_add_roadmap_cover_image.sql
│     ├─ 20250718000004_attachments.sql
│     ├─ 20250718000005_roadmap_tables.sql
│     ├─ 20250718000006_journals.sql
│     ├─ 20250718000007_personal_codes.sql
│     ├─ 20250718000008_add_is_public_to_notes.sql
│     ├─ 20250719000001_fix_user_completed_stats_function.sql
│     ├─ 20250719000002_update_user_completed_stats_function.sql
│     ├─ 20250719135538_add_public_roadmap_column.sql
│     ├─ 20250719193308_update_get_current_roadmap_function.sql
│     ├─ 20250719195500_update_get_completed_roadmaps_function.sql
│     ├─ 20250720142213_add_rls_policies_for_post_likes.sql
│     ├─ 20250720150000_add_toggle_post_like_function.sql
│     ├─ 20250721_144700_fix_message_media_urls_type.sql
│     ├─ 20250721_145400_insert_chat_message.sql
│     ├─ 20250722000000_add_chat_rls_policies.sql
│     ├─ 20250722000000_update_chat_room_functions.sql
│     ├─ 20250722000001_fix_profiles_rls_policy.sql
│     ├─ 20250724114803_add_public_attachments_policies.sql
│     ├─ 20250724114804_update_attachment_policies.sql
│     ├─ 20250724124805_add_similarity_matching_tables.sql
│     ├─ 20250724130000_add_terms_acceptance_to_profiles.sql
│     ├─ 20250729090800_update_user_trigger_for_terms.sql
│     ├─ 20250729201000_add_delete_policy_for_post_media.sql
│     ├─ 20250730000000_add_unfinished_roadmaps_function.sql
│     ├─ 20250730000001_add_avatar_deletion_function.sql
│     └─ 20250730000100_add_update_roadmap_status_function.sql
├─ superbase-db.md
├─ tailwind.config.ts
├─ tsconfig.json
├─ types
│  ├─ chat.ts
│  ├─ global.d.ts
│  ├─ index.ts
│  ├─ note-form.ts
│  ├─ note.ts
│  ├─ post.ts
│  ├─ react-easy-crop.d.ts
│  ├─ roadmap.ts
│  └─ tiptap.ts
└─ utils
   ├─ console.js
   ├─ secureFileUrl.ts
   ├─ storageDebug.ts
   └─ tiptap-utils.ts

```