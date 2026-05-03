import { useState, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { fetchLyricsList, fetchLyricsContent } from './api';
import type { GitHubFile } from './api';
import './App.css';

function App() {
  const [files, setFiles] = useState<GitHubFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<GitHubFile | null>(null);
  const [content, setContent] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(false);
  const [youtubeId, setYoutubeId] = useState<string | null>(null);

  // Helper to extract YouTube ID from markdown content
  const extractYoutubeId = (text: string) => {
    const patterns = [
      /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
      /youtu\.be\/([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  // Initialize: fetch the file list
  useEffect(() => {
    async function init() {
      try {
        const list = await fetchLyricsList();
        setFiles(list);
        if (list.length > 0) {
          handleFileSelect(list[0]);
        }
      } catch (error) {
        console.error("Error loading lyrics list:", error);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  // Fetch content when a file is selected
  const handleFileSelect = async (file: GitHubFile) => {
    setSelectedFile(file);
    setContentLoading(true);
    setYoutubeId(null); // Reset video
    try {
      const text = await fetchLyricsContent(file.download_url);
      setContent(text);
      setYoutubeId(extractYoutubeId(text));
    } catch (error) {
      console.error("Error loading content:", error);
      setContent("# Error loading content\nPlease check your internet connection.");
    } finally {
      setContentLoading(false);
    }
  };

  // Filter files based on search term
  const filteredFiles = useMemo(() => {
    return files.filter(file => 
      file.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [files, searchTerm]);

  // Clean filename for display (remove .md)
  const formatName = (name: string) => name.replace(/\.md$/i, '');

  if (loading) {
    return <div className="loading-screen">Loading Lyrics...</div>;
  }

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1>Lyrics & Analysis</h1>
          <input 
            type="text" 
            placeholder="Search songs..." 
            className="search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <nav className="file-list">
          {filteredFiles.map((file) => (
            <div 
              key={file.path}
              className={`file-item ${selectedFile?.path === file.path ? 'active' : ''}`}
              onClick={() => handleFileSelect(file)}
            >
              {formatName(file.name)}
            </div>
          ))}
          {filteredFiles.length === 0 && (
            <div className="file-item" style={{ opacity: 0.5 }}>No results found</div>
          )}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="content-area">
        {contentLoading ? (
          <div className="loading-content">Loading content...</div>
        ) : (
          <article className="markdown-body">
            {youtubeId && (
              <div className="video-container">
                <iframe
                  width="100%"
                  height="100%"
                  src={`https://www.youtube.com/embed/${youtubeId}?origin=${window.location.origin}&enablejsapi=1`}
                  title="YouTube video player"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                ></iframe>
              </div>
            )}
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {content}
            </ReactMarkdown>
          </article>
        )}
      </main>
    </div>
  );
}

export default App;
