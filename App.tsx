import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { ContentWindow } from './components/ContentWindow';
import { StatusBar } from './components/StatusBar';
import { useProfileData, useBlogIndex } from './hooks/useMarkdownContent';
import { useTheme } from './hooks/useTheme';

const App: React.FC = () => {
  const [theme, toggleTheme] = useTheme();
  const profileData = useProfileData('/content/profile.md', theme);
  const blogPosts = useBlogIndex('/content/blog/index.md');
  const [activeSection, setActiveSection] = useState<string>('About Me');
  const [activePostSlug, setActivePostSlug] = useState<string | null>(null);

  const handleSelectSection = (section: string) => {
    setActiveSection(section);
    setActivePostSlug(null); // Reset post when changing main section
  };

  const sectionTitles = profileData?.sections.map(s => s.title) || [];
  const currentSectionData = profileData?.sections.find(s => s.title === activeSection);

  const activePost = blogPosts.find(p => p.slug === activePostSlug);
  const statusText = activePost ? `Blog > ${activePost.title}` : activeSection;

  return (
    <div className={`
      flex flex-col h-screen font-mono
      bg-[var(--ctp-base)] text-[var(--ctp-text)]
      transition-colors duration-300
    `}>
      {profileData ? (
        <>
          {/* <Header name={profileData.name} /> */}
          <div className="flex flex-1 overflow-hidden">
            <Sidebar
              sections={sectionTitles}
              activeSection={activeSection}
              onSelectSection={handleSelectSection}
            />
            <div className="flex-1 flex flex-col min-w-0">
                <ContentWindow
                  section={currentSectionData}
                  activePostSlug={activePostSlug}
                  onSelectPost={setActivePostSlug}
                  onBackToBlogIndex={() => setActivePostSlug(null)}
                  blogPosts={blogPosts}
                />
            </div>
          </div>
          <StatusBar
            theme={theme}
            onToggleTheme={toggleTheme}
            activeSection={statusText}
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
