import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { TabBar } from './components/TabBar';
import { ContentWindow } from './components/ContentWindow';
import { StatusBar } from './components/StatusBar';
import { useProfileData, useBlogIndex } from './hooks/useMarkdownContent';
import { useTheme } from './hooks/useTheme';

const isMobileDevice = () => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

const App: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [theme, toggleTheme] = useTheme();
  const profileData = useProfileData('/content/profile.md', theme);
  const blogPosts = useBlogIndex('/content/blog/index.md');
  const [activeSection, setActiveSection] = useState<string>('About Me');
  const [activePostSlug, setActivePostSlug] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'sidebar' | 'tab'>(isMobileDevice() ? 'tab' : 'sidebar');
  const [zenMode, setZenMode] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(isMobileDevice());

  useEffect(() => {
    const path = location.pathname;
    const searchParams = new URLSearchParams(location.search);
    const sectionParam = searchParams.get('section');
    
    if (path.startsWith('/blog/')) {
      const slug = path.replace('/blog/', '');
      if (slug) {
        setActiveSection('Blog');
        setActivePostSlug(slug);
      }
    } else if (sectionParam) {
      const decodedSection = decodeURIComponent(sectionParam);
      if (profileData?.sections.some(s => s.title === decodedSection)) {
        setActiveSection(decodedSection);
        setActivePostSlug(null);
      }
    }
  }, [location, profileData]);

  useEffect(() => {
    const handleResize = () => {
      const mobile = isMobileDevice();
      setIsMobile(mobile);
      if (mobile && viewMode === 'sidebar') {
        setViewMode('tab');
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [viewMode]);

  const handleSelectSection = (section: string) => {
    setActiveSection(section);
    setActivePostSlug(null);
    navigate(`/?section=${encodeURIComponent(section)}`);
  };

  const handleSelectPost = (slug: string) => {
    setActivePostSlug(slug);
    setActiveSection('Blog');
    navigate(`/blog/${slug}`);
  };

  const handleBackToBlogIndex = () => {
    setActivePostSlug(null);
    navigate('/?section=Blog');
  };

  const toggleViewMode = () => {
    setViewMode(prev => prev === 'sidebar' ? 'tab' : 'sidebar');
  };

  const toggleZenMode = () => {
    setZenMode(prev => !prev);
  };

  const sectionTitles = profileData?.sections.map(s => s.title) || [];
  const currentSectionData = profileData?.sections.find(s => s.title === activeSection);

  const activePost = blogPosts.find(p => p.slug === activePostSlug);
  const statusText = activePost ? `Blog > ${activePost.title}` : activeSection;
  const [wordCount, setWordCount] = useState<number>(0);

  const MainContent = () => (
    <>
      <div className="flex flex-1 overflow-hidden">
        {viewMode === 'sidebar' && !zenMode ? (
          <Sidebar
            sections={sectionTitles}
            activeSection={activeSection}
            onSelectSection={handleSelectSection}
          />
        ) : null}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {viewMode === 'tab' && !zenMode ? (
              <TabBar
                sections={sectionTitles}
                activeSection={activeSection}
                onSelectSection={handleSelectSection}
              />
            ) : null}
            <ContentWindow
              section={currentSectionData}
              activePostSlug={activePostSlug}
              onSelectPost={handleSelectPost}
              onBackToBlogIndex={handleBackToBlogIndex}
              blogPosts={blogPosts}
              zenMode={zenMode}
              onWordCountChange={setWordCount}
            />
        </div>
      </div>
    </>
  );

  return (
    <div className={`
      flex flex-col h-screen font-mono overflow-hidden
      bg-[var(--ctp-base)] text-[var(--ctp-text)]
      transition-colors duration-300
    `}>
      {profileData ? (
        <>
          <div className="flex-1 overflow-hidden">
            <Routes>
              <Route path="/" element={<MainContent />} />
              <Route path="/blog/:slug" element={<MainContent />} />
            </Routes>
          </div>
          <StatusBar
            theme={theme}
            onToggleTheme={toggleTheme}
            activeSection={statusText}
            viewMode={viewMode}
            onToggleViewMode={toggleViewMode}
            zenMode={zenMode}
            onToggleZenMode={toggleZenMode}
            wordCount={wordCount}
          />
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <p>Loading profile...</p>
        </div>
      )}
    </div>
  );
};

export default App;
