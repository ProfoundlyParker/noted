<h1 align='center'>Noted 📓<br>
Live Site: https://noted-notebook.netlify.app/
</h1>

![noted-use-example](readme-imgs/noted-main-gif.gif)

# Description
<p>Noted is a Notion-style online editor that allows users to create, edit, and organize rich content pages. It's powered by <strong>Supabase</strong> as the backend (for auth, storage, and database), and built with <strong>React.js</strong>, <strong>TypeScript</strong>, and <strong>Vite</strong> on the frontend, deployed on <strong>Netlify</strong>. Users can sign in passwordlessly, edit blocks, reorder content via drag-and-drop, and customize pages with emojis, cover images, and resizable images w/ captions. The app includes comprehensive unit and integration testing with over <strong>95% line coverage</strong> using <strong>Vitest</strong> and <strong>React Testing Library</strong></p>

<h1>How to Use:</h1>
<p>Enter your email address to sign in passwordlessly</p>

![sign-in-example](readme-imgs/noted-login.gif)<br>

<p>Check your email inbox for an email from <strong>Supabase Auth</strong> titled <strong>Join Noted 📓</strong></p>

![sign-up-email](readme-imgs/noted-email.png)<br>

<p>Follow the instructions on the home page to learn how the app works</p>

![noted-home-page](readme-imgs/noted-home-page.gif)

<p>Add different content blocks (nodes), including:</p>
<ul>
    <li>Text blocks</li>
    <li>Headings (H1-H3)</li>
    <li>Ordered and unordered lists</li>
    <li>Images with captions</li>
    <li>Links to other pages</li>
</ul>

![basic-nodes](readme-imgs/noted-basic-nodes.gif)

<p>Rearrange content with drag and drop by dragging any block to reposition it within the page using smooth, intuitive drag-and-drop interactions</p>

![drag-and-drop](readme-imgs/noted-drag-drop.gif)

<p>Customize page visuals:</p>
<ul>
    <li>Add a cover image to any page</li>
    <li>Reposition the cover image vertically</li>
    <li>Resize images on desktop and laptop screens</li>
    <li>Change the page's emoji</li>
</ul>

![page-visuals](readme-imgs/noted-page-visuals.gif)

<p>Navigate between pages by linking to other pages within Noted to create a connected workspace</p>

![page-navigation](readme-imgs/noted-navigation.gif)

## Features
<li>Passwordless authentication using Supabase's magic link auth system
</li>
<br>
<img src='readme-imgs/noted-home.png'>
<li>Pages consist of draggable content "nodes" using @dnd-kit
</li>
<br>
<img src='readme-imgs/noted-drag.gif'>
<li>Multiple node types accessible by typing '/' to bring up the command panel + search for node type or use arrow keys to move between the options
</li>
<br>
<img src='readme-imgs/noted-command-panel.gif'>
<li>Supports image + caption uploads by using Supabase's S3 buckets
</li>
<br>
<img src='readme-imgs/noted-image-upload.gif'">
<li>Row-Level Security (RLS) on Supabase DB
</li>
<br>
<img src='readme-imgs/noted-rls.png'>
<li>Unit + integration tests with 95%+ line coverage
</li>
<br>
<img src='readme-imgs/noted-tests.png'>
<li>Persistant storage using Supabase for the DB and S3 image bucket
</li>
<br>
<img src='readme-imgs/noted-supabase.png'>
<li>Image resizing on desktop + laptop screens using re-resizable
</li>
<br>
<img src='readme-imgs/noted-resize.gif'>
<li>Cover images on each page with vertical repositioning
</li>
<br>
<img src='readme-imgs/noted-reposition.gif'>
<li>Pick an emoji for each page using emoji-picker
</li>
<br>
<img src='readme-imgs/noted-emoji.gif'>
<li>Easily delete pages that you no longer need
</li>
<br>
<img src='readme-imgs/noted-page-delete.gif'>
<li>Replace or delete images with buttons visible on hover
</li>
<br>
<img src='readme-imgs/noted-image-btns.gif'>
<li>Tokens removed during sign-out, so re-authentication is required
</li>
<br>
<img src='readme-imgs/noted-signout.gif'>
<li>Responsive layout using Flexbox
</li>
<br>
<img src='readme-imgs/noted-flexbox.png'>
<li>Form Validation & Error Messages
</li>
<br>
<img src='readme-imgs/noted-err-1.png' style="width: 15rem;">
<img src='readme-imgs/noted-err-2.png' style="width: 15rem;">
<img src='readme-imgs/noted-err-3.png' style="width: 15rem;">
<img src='readme-imgs/noted-err-4.png' style="width: 15rem;">
<li>Custom site favicon
</li>
<br>
<img src='public/noted.ico' height='200' width='200'>
<li>Mobile-friendly
</li>
<br>
<img src='readme-imgs/sb-mobile.gif.gif'>

<h3>Technical challenges I overcame:</h3>
<li>Designing a Notion-style block architecture where each node type has its own rendering, state, and drag behaviour</li>
<li>Persisting complex editor state (node order, content, image metadata, captions, and resize/repositioning dimensions) in Supabase</li>
<li>Building repositionable cover images while preventing layout breakage or white space overflow</li>
<li>Writing extensive unit and integration tests for a highly interactive UI, achieving over 95% line coverage</li>
<li>Mocking external dependencies (Supabase, drag events, image repositioning, emoji picker) for reliable tests</li>
<li>Ensuring keyboard usability in an interactive editor environment</li>

<h3>Possible Future Improvements:</h3>
<li>Unsplash API integration to allow users to choose from stock photos for cover images</li>
<li>Page descriptions and/or tags</li>
<li>Rich text formatting (bold, italic, inline code, etc)</li>
<li>Collaborative real-time editing</li>
<li>Version history and undo/redo support</li>
<li>Public page sharing + read-only views</li>
<li>Import/export pages</li>
<li>Dark mode</li>

  
