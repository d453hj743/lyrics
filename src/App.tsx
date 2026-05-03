import { useState, useEffect, useMemo, useRef, ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import YouTube from 'react-youtube';
import type { YouTubeProps } from 'react-youtube';
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
  
  const playerRef = useRef<any>(null);

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

  const timestampToSeconds = (timestamp: string) => {
    const match = timestamp.match(/\[(\d+):(\d+)\]/);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      return minutes * 60 + seconds;
    }
    return 0;
  };

  useEffect(() => {
    async function init() {
      try {
        const list = await fetchLyricsList();
        setFiles(list);
        if (list.length > 0) handleFileSelect(list[0]);
      } catch (error) {
        console.error("Error loading lyrics list:", error);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  const handleFileSelect = async (file: GitHubFile) => {
    setSelectedFile(file);
    setContentLoading(true);
    setYoutubeId(null);
    try {
      const text = await fetchLyricsContent(file.download_url);
      setContent(text);
      setYoutubeId(extractYoutubeId(text));
    } catch (error) {
      console.error("Error loading content:", error);
      setContent("# Error loading content");
    } finally {
      setContentLoading(false);
    }
  };

  const seekTo = (seconds: number) => {
    if (playerRef.current) {
      playerRef.current.seekTo(seconds, true);
      playerRef.current.playVideo();
    }
  };

  const filteredFiles = useMemo(() => {
    return files.filter(file => file.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [files, searchTerm]);

  const formatName = (name: string) => name.replace(/\.md$/i, '');

  // Improved text processor that handles timestamp nodes
  const processNodes = (nodes: ReactNode): ReactNode => {
    if (typeof nodes === 'string') {
      const parts = nodes.split(/(\[\d+:\d+\])/g);
      return parts.map((part, index) => {
        if (part.match(/\[\d+:\d+\]/)) {
          const seconds = timestampToSeconds(part);
          return (
            <button 
              key={index} 
              className="timestamp-btn" 
              onClick={(e) => {
                e.preventDefault();
                seekTo(seconds);
              }}
            >
              {part}
            </button>
          );
        }
        return part;
      });
    }
    
    if (Array.isArray(nodes)) {
      return nodes.map((node, index) => <span key={index}>{processNodes(node)}</span>);
    }

    return nodes;
  };

  const onPlayerReady: YouTubeProps['onReady'] = (event) => {
    playerRef.current = event.target;
  };

  if (loading) return <div className="loading-screen">Loading...</div>;

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1>Lyrics & Analysis</h1>
          <input 
            type="text" 
            placeholder="Search..." 
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
        </nav>
      </aside>

      <main className="content-area">
        {contentLoading ? (
          <div className="loading-content">Loading...</div>
        ) : (
          <article className="markdown-body">
            {youtubeId && (
              <div className="video-container">
                <YouTube 
                  videoId={youtubeId} 
                  onReady={onPlayerReady}
                  opts={{ width: '100%', height: '100%', playerVars: { autoplay: 0, origin: window.location.origin } }}
                />
              </div>
            )}
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children }) => <p>{processNodes(children)}</p>,
                td: ({ children }) => <td>{processNodes(children)}</td>,
                th: ({ children }) => <th>{processNodes(children)}</th>,
                h1: ({ children }) => <h1>{processNodes(children)}</h1>,
                h2: ({ children }) => <h2>{processNodes(children)}</h2>,
                h3: ({ children }) => <h3>{processNodes(children)}</h3>,
                li: ({ children }) => <li>{processNodes(children)}</li>,
                strong: ({ children }) => <strong>{processNodes(children)}</strong>,
                em: ({ children }) => <em>{processNodes(children)}</em>,
              }}
            >
              {content}
            </ReactMarkdown>
          </article>
        )}
      </main>
    </div>
  );
}

export default App;
