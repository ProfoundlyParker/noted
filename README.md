Noted is a Notion-style collaborative editor that allows users to create, edit, and organize rich content pages. It's powered by **Supabase** as the backend (for auth, storage, and database), and built with **React** on the frontend. Users can sign in passwordlessly, edit blocks, reorder content via drag-and-drop, and customize pages with emojis, cover images, and resizable images w/ captions.

<p>Please click <a href="https://parkerramey.super.site/projects/noted">here</a> to view a video preview</p>

This project is currently a work in progress. They key features can be seen below, as well as some possible future improvements

### **Key Features:**

- **🔐 Passwordless Authentication**
    - Users log in with Supabase’s magic link auth system (no passwords)
    - Session persists, with support for sign-out and redirect to auth page
- **🪄 Rich Block-Based Editor**
    - Pages consist of draggable content “nodes” (e.g., text blocks).
    - Supports image uploads
    - Images can be resized + have captions
- **🖼️ Cover Image Upload and Repositioning**
    - Each page can have a repositionable cover image
    - Users can drag to reposition the image (similar to Notion).
    - Images are stored in Supabase AWS bucket
- **😀 Emoji Picker for Page Icons**
    - Users can click to open an emoji picker and update the page icon
    - The selected emoji is saved to Supabase and rendered on the page

### Possible Future Improvements:

- Unit + integration tests (as of 8/25: already implemented with over 90% coverage)
- Unsplash API integration to allow users to choose from stock photos
- Page descriptions and/or tags
