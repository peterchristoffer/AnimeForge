import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Upload, 
  Download, 
  RefreshCw, 
  User, 
  Palette, 
  Sword, 
  Zap, 
  Brain, 
  Heart,
  Camera,
  X,
  Type as TypeIcon,
  Image as ImageIcon,
  Check,
  Quote,
  Gamepad2,
  Trophy,
  Target,
  Shield,
  Info
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { cn } from './lib/utils';
import { CharacterData, GeneratedCharacter, AnimeStyle } from './types';
import { generateCharacterImage, generateCharacterStory, editCharacterImage } from './services/aiService';

const STYLES: AnimeStyle[] = [
  'Shonen', 'Shojo', 'Seinen', 'Cyberpunk', 'Fantasy', 'Ghibli-esque', 
  'Mecha', 'Horror', 'Slice of Life', 'Isekai', 'Retro 90s', 'Ukiyo-e'
];

const CLOTHING_STYLES = [
  'Cyberpunk Techwear',
  'Traditional Samurai Armor',
  'Modern Streetwear',
  'Gothic Lolita',
  'Steampunk Explorer',
  'High School Uniform',
  'Fantasy Mage Robes',
  'Futuristic Pilot Suit',
  'Ninja Stealth Gear',
  'Royal Formal Wear'
];
const SIZES: CharacterData['imageSize'][] = ['1K', '2K', '4K'];

export default function App() {
  const [step, setStep] = useState(0); // 0: Key Selection, 1: Form, 2: Loading, 3: Result
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editPrompt, setEditPrompt] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [hasKey, setHasKey] = useState(false);

  React.useEffect(() => {
    const checkKey = async () => {
      // @ts-ignore
      const selected = await window.aistudio.hasSelectedApiKey();
      if (selected) {
        setHasKey(true);
        setStep(1);
      }
    };
    checkKey();
  }, []);

  const handleOpenKeyDialog = async () => {
    // @ts-ignore
    await window.aistudio.openSelectKey();
    setHasKey(true);
    setStep(1);
  };

  const [characterData, setCharacterData] = useState<CharacterData>({
    name: '',
    gender: 'Male',
    style: 'Shonen',
    clothingStyle: 'Modern Streetwear',
    features: {
      hairColor: 'Black',
      eyeColor: 'Blue',
      outfit: 'School Uniform',
      accessory: 'None'
    },
    personality: '',
    imageSize: '1K'
  });
  const [result, setResult] = useState<GeneratedCharacter | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCharacterData(prev => ({ ...prev, photoBase64: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!characterData.name) return alert('Please give your character a name!');
    setLoading(true);
    try {
      const imageUrl = await generateCharacterImage(characterData);
      const { story, stats, coolName, japaneseSummary } = await generateCharacterStory(characterData);
      setResult({ imageUrl, story, stats, japaneseSummary });
      // Update character name to the cool version
      setCharacterData(prev => ({ ...prev, name: coolName }));
      setStep(3);
    } catch (error: any) {
      console.error(error);
      alert(error.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!result || !editPrompt) return;
    setEditing(true);
    try {
      const newImageUrl = await editCharacterImage(result.imageUrl, editPrompt);
      setResult(prev => prev ? { ...prev, imageUrl: newImageUrl } : null);
      setEditPrompt('');
    } catch (error: any) {
      console.error(error);
      alert(error.message || 'Failed to edit image.');
    } finally {
      setEditing(false);
    }
  };

  const handlePublish = async () => {
    if (!result) return;
    setPublishing(true);
    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: characterData.name,
          imageUrl: result.imageUrl,
          story: result.story,
          stats: result.stats,
          style: characterData.style,
          clothingStyle: characterData.clothingStyle
        })
      });
      
      if (!response.ok) throw new Error('Failed to publish');
      
      const data = await response.json();
      alert(data.message || 'Character published to community!');
    } catch (error: any) {
      console.error(error);
      alert('Failed to publish character. Please try again.');
    } finally {
      setPublishing(false);
    }
  };

  const downloadCard = async () => {
    if (cardRef.current) {
      const canvas = await html2canvas(cardRef.current, {
        useCORS: true,
        backgroundColor: null,
        scale: 2
      });
      const link = document.createElement('a');
      link.download = `${characterData.name}-trading-card.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    }
  };

  return (
    <div className="min-h-screen bg-brand-dark text-slate-200 selection:bg-blue-500 relative overflow-hidden">
      {/* Epic Background Image */}
      <div 
        className="fixed inset-0 z-0 opacity-20 pointer-events-none"
        style={{ 
          backgroundImage: 'url("https://storage.googleapis.com/aistudio-preview-uploads/image_1740907984813_0.png")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      
      {/* Animated Glows */}
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-blue/10 blur-[120px] rounded-full pointer-events-none animate-pulse" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand-accent/5 blur-[120px] rounded-full pointer-events-none animate-pulse delay-700" />
      
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-blue rounded-xl flex items-center justify-center shadow-lg shadow-brand-blue/20 rotate-3">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h1 className="font-display font-black text-2xl tracking-tighter text-white uppercase italic neon-text">AnimeForge</h1>
          </div>
          
          <div className="flex items-center gap-8">
            <div className="hidden md:flex items-center gap-2">
              {[1, 2, 3].map((s) => (
                <div 
                  key={s}
                  className={cn(
                    "w-8 h-1.5 rounded-full transition-all duration-500",
                    step >= s ? "bg-brand-blue shadow-[0_0_10px_rgba(59,130,246,0.5)]" : "bg-slate-800"
                  )}
                />
              ))}
            </div>
            
            {step > 1 && (
              <button 
                onClick={() => { setStep(1); setResult(null); }}
                className="text-sm font-bold text-slate-400 hover:text-brand-accent transition-colors flex items-center gap-2 uppercase tracking-widest"
              >
                <RefreshCw className="w-4 h-4" />
                Reset
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-16">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div
              key="key-selection"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="max-w-2xl mx-auto text-center space-y-8 py-20"
            >
              <div className="anime-panel space-y-6">
                <div className="w-20 h-20 bg-brand-blue/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Shield className="w-10 h-10 text-brand-blue" />
                </div>
                <h2 className="text-4xl font-display font-black text-white uppercase italic neon-text">API Key Required</h2>
                <p className="text-slate-400 text-lg">
                  To generate high-quality anime characters and stories, you need to select a paid Gemini API key. 
                  This ensures you have enough quota for your legendary creations.
                </p>
                <div className="pt-6">
                  <button
                    onClick={handleOpenKeyDialog}
                    className="anime-button w-full max-w-md mx-auto"
                  >
                    <Target className="w-6 h-6" />
                    Select API Key
                  </button>
                </div>
                <p className="text-xs text-slate-500 pt-4">
                  Don't have a key? Check the <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-brand-blue hover:underline">billing documentation</a>.
                </p>
              </div>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="space-y-16"
            >
              <div className="text-center space-y-6">
                <motion.h2 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-5xl md:text-7xl font-display font-black text-white uppercase italic tracking-tighter neon-text"
                >
                  Forge Your <span className="text-brand-blue">Legend</span>
                </motion.h2>
                <p className="text-slate-400 max-w-2xl mx-auto text-xl font-medium leading-relaxed">
                  The ultimate anime character creator. Upload a photo or design from scratch to create your unique trading card.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* Basic Info */}
                <div className="anime-panel space-y-8">
                  <div className="flex items-center gap-3 mb-2">
                    <Gamepad2 className="w-6 h-6 text-brand-blue" />
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Character Identity</label>
                  </div>
                  <div className="space-y-4">
                    <div className="relative">
                      <User className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-500" />
                      <input 
                        type="text"
                        placeholder="Enter Name..."
                        className="anime-input pl-14"
                        value={characterData.name}
                        onChange={e => setCharacterData(prev => ({ ...prev, name: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Gender Selection</label>
                    <div className="grid grid-cols-3 gap-3">
                      {['Male', 'Female', 'Other'].map(g => (
                        <button
                          key={g}
                          onClick={() => setCharacterData(prev => ({ ...prev, gender: g as any }))}
                          className={cn(
                            "py-4 rounded-2xl text-sm font-black uppercase tracking-widest transition-all border-2",
                            characterData.gender === g 
                              ? "bg-brand-blue border-brand-blue text-white shadow-lg shadow-brand-blue/20" 
                              : "bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700"
                          )}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Art Style</label>
                    <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto p-1 custom-scrollbar">
                      {STYLES.map(style => (
                        <button
                          key={style}
                          onClick={() => setCharacterData(prev => ({ ...prev, style }))}
                          className={cn(
                            "py-4 px-6 rounded-2xl text-xs font-black uppercase tracking-widest transition-all border-2 text-left",
                            characterData.style === style 
                              ? "bg-brand-blue border-brand-blue text-white shadow-lg shadow-brand-blue/20" 
                              : "bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700"
                          )}
                        >
                          {style}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Clothing Style</label>
                    <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto p-1 custom-scrollbar">
                      {CLOTHING_STYLES.map(style => (
                        <button
                          key={style}
                          onClick={() => setCharacterData(prev => ({ ...prev, clothingStyle: style }))}
                          className={cn(
                            "py-4 px-6 rounded-2xl text-xs font-black uppercase tracking-widest transition-all border-2 text-left",
                            characterData.clothingStyle === style 
                              ? "bg-brand-blue border-brand-blue text-white shadow-lg shadow-brand-blue/20" 
                              : "bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700"
                          )}
                        >
                          {style}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Custom Aesthetic</label>
                    <input 
                      type="text"
                      placeholder="e.g. Neon Samurai, Space Pirate..."
                      className="anime-input"
                      value={characterData.customStyle || ''}
                      onChange={e => setCharacterData(prev => ({ ...prev, customStyle: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Features & Photo */}
                <div className="anime-panel space-y-8">
                  <div className="flex items-center gap-3 mb-2">
                    <Target className="w-6 h-6 text-brand-blue" />
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Backstory & Vibe</label>
                  </div>
                  <div className="space-y-4">
                    <textarea 
                      placeholder="What's their mission? Their secret power? Describe their personality..."
                      className="anime-input h-40 resize-none"
                      value={characterData.personality}
                      onChange={e => setCharacterData(prev => ({ ...prev, personality: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-4">
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-[0.2em]">Visual Reference</label>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="relative group">
                        <input 
                          type="file" 
                          accept="image/*"
                          onChange={handlePhotoUpload}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <div className={cn(
                          "border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center gap-3 transition-all h-40",
                          characterData.photoBase64 ? "border-brand-blue bg-brand-blue/5" : "border-slate-800 group-hover:border-slate-700"
                        )}>
                          <Upload className="w-8 h-8 text-slate-500" />
                          <span className="text-xs font-black uppercase tracking-widest text-slate-400">Upload</span>
                        </div>
                      </div>

                      <div className="relative group">
                        <input 
                          type="file" 
                          accept="image/*"
                          capture="user"
                          onChange={handlePhotoUpload}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <div className={cn(
                          "border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center gap-3 transition-all h-40",
                          characterData.photoBase64 ? "border-brand-blue bg-brand-blue/5" : "border-slate-800 group-hover:border-slate-700"
                        )}>
                          <Camera className="w-8 h-8 text-slate-500" />
                          <span className="text-xs font-black uppercase tracking-widest text-slate-400">Camera</span>
                        </div>
                      </div>
                    </div>

                    {characterData.photoBase64 && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex items-center gap-4 p-4 bg-brand-blue/10 border-2 border-brand-blue/30 rounded-2xl"
                      >
                        <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-brand-blue/30 shadow-lg">
                          <img src={characterData.photoBase64} alt="Preview" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-black text-brand-blue uppercase tracking-widest">DNA Captured!</p>
                          <button 
                            onClick={() => setCharacterData(prev => ({ ...prev, photoBase64: undefined }))}
                            className="text-xs font-bold text-slate-500 hover:text-brand-accent transition-colors uppercase tracking-widest mt-1"
                          >
                            Remove Data
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-center pt-8">
                <button
                  onClick={handleGenerate}
                  disabled={loading || !characterData.name}
                  className="anime-button w-full max-w-md h-20 text-xl"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-8 h-8 animate-spin" />
                      Forging Legend...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-8 h-8" />
                      Generate Character
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {step === 3 && result && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start"
            >
              {/* Left: Trading Card Preview */}
              <div className="lg:col-span-5 flex flex-col items-center gap-8">
                <div 
                  ref={cardRef}
                  className="trading-card-container bg-slate-950 border-4 border-slate-800 relative group"
                >
                  {/* Card Header */}
                  <div 
                    className="absolute top-0 inset-x-0 h-20 z-10 px-6 flex items-center justify-between"
                    style={{ background: 'linear-gradient(to bottom, rgba(2, 6, 23, 0.9) 0%, rgba(2, 6, 23, 0) 100%)' }}
                  >
                    <span className="graffiti-text text-white text-2xl tracking-widest uppercase italic">{characterData.name}</span>
                    <div 
                      className="w-10 h-10 bg-brand-blue rounded-full flex items-center justify-center border-2 border-white shadow-xl"
                      style={{ boxShadow: '0 0 20px rgba(59, 130, 246, 0.5)' }}
                    >
                      <Zap className="w-5 h-5 text-white fill-white" />
                    </div>
                  </div>

                  {/* Character Image */}
                  <div className="w-full h-full relative">
                    {editing && <div className="scanning-line" />}
                    <img 
                      src={result.imageUrl} 
                      alt={characterData.name}
                      className={cn("w-full h-full object-cover transition-opacity duration-500", editing ? "opacity-40" : "opacity-100")}
                      referrerPolicy="no-referrer"
                    />
                    <div 
                      className="absolute inset-0 opacity-60" 
                      style={{ background: 'linear-gradient(to top, rgba(2, 6, 23, 1) 0%, rgba(2, 6, 23, 0) 100%)' }}
                    />
                  </div>

                  {/* Card Footer / Stats Overlay */}
                  <div 
                    className="absolute bottom-0 inset-x-0 p-6"
                    style={{ background: 'linear-gradient(to top, rgba(2, 6, 23, 1) 0%, rgba(2, 6, 23, 0.9) 60%, rgba(2, 6, 23, 0) 100%)' }}
                  >
                    <div className="mb-4">
                      <p className="text-[10px] text-brand-blue font-black tracking-[0.3em] uppercase mb-2">Legendary Backstory</p>
                      <p className="text-xs text-slate-200 font-medium leading-relaxed line-clamp-2">{result.japaneseSummary}</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-x-6 gap-y-4 mb-4">
                      {[
                        { label: 'STR', val: result.stats.strength, icon: Sword, color: 'bg-red-500' },
                        { label: 'AGI', val: result.stats.agility, icon: Zap, color: 'bg-yellow-500' },
                        { label: 'INT', val: result.stats.intelligence, icon: Brain, color: 'bg-blue-500' },
                        { label: 'SPI', val: result.stats.spirit, icon: Heart, color: 'bg-emerald-500' }
                      ].map((stat) => (
                        <div key={stat.label} className="space-y-1.5">
                          <div className="flex items-center justify-between text-[10px] font-black text-slate-400">
                            <span className="flex items-center gap-1">
                              <stat.icon className="w-3 h-3" />
                              {stat.label}
                            </span>
                            <span>{stat.val}</span>
                          </div>
                          <div className="stat-bar-container">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${stat.val}%` }}
                              className={cn("stat-bar-fill", stat.color)} 
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="pt-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex justify-between items-center" style={{ borderTop: '1px solid rgba(30, 41, 59, 0.5)' }}>
                      <span className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-brand-blue animate-pulse" />
                        {characterData.style} CLASS
                      </span>
                      <span>#AF-{Math.floor(Math.random() * 9000) + 1000}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={downloadCard}
                  className="anime-button w-full bg-white text-slate-950 hover:bg-slate-100 shadow-2xl"
                >
                  <Download className="w-6 h-6" />
                  Download Card
                </button>

                <button
                  onClick={handlePublish}
                  disabled={publishing}
                  className="anime-button w-full bg-brand-blue text-white hover:bg-brand-blue/90 shadow-2xl"
                >
                  {publishing ? <RefreshCw className="w-6 h-6 animate-spin" /> : <Upload className="w-6 h-6" />}
                  Publish to Community
                </button>
              </div>

              {/* Right: Story & Editing */}
              <div className="lg:col-span-7 space-y-10">
                <div className="anime-panel space-y-8">
                  <div className="space-y-2">
                    <h3 className="text-3xl font-display font-black text-white uppercase italic italic tracking-tighter">The Legend of {characterData.name}</h3>
                    <div className="h-1.5 w-20 bg-brand-blue rounded-full" />
                  </div>
                  <div className="relative">
                    <Quote className="absolute -left-4 -top-4 w-12 h-12 text-slate-800 -z-10" />
                    <p className="text-slate-300 leading-relaxed text-xl font-medium italic">
                      {result.story}
                    </p>
                  </div>
                </div>

                <div className="anime-panel space-y-8">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h4 className="text-xl font-black text-white uppercase tracking-widest flex items-center gap-3">
                        <Palette className="w-6 h-6 text-brand-blue" />
                        Refine Legend
                      </h4>
                      <p className="text-sm font-medium text-slate-500">Evolve your character's appearance with AI</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-4 bg-slate-950/50 rounded-2xl border-2 border-slate-800 custom-scrollbar">
                      {[
                        'Add glowing eyes', 'Add mechanical arm', 'Add dragon wings', 'Add lightning sparks', 
                        'Add cat ears', 'Add samurai sword', 'Add futuristic headset', 'Add magical staff', 
                        'Add fire aura', 'Add robotic pet', 'Add cape', 'Add facial scars', 
                        'Add tattoos', 'Add floating crystals', 'Add demon horns', 'Add halo', 
                        'Add dual pistols', 'Add ninja mask', 'Add steampunk goggles', 'Add cherry blossom petals',
                        'Add retro filter', 'Make it nighttime', 'Add glowing aura', 'Change to winter outfit'
                      ].map(suggestion => (
                        <button
                          key={suggestion}
                          onClick={() => setEditPrompt(prev => prev ? `${prev}, ${suggestion}` : suggestion)}
                          className="px-4 py-2 bg-slate-800 hover:bg-brand-blue hover:text-white text-slate-400 rounded-full text-xs font-black uppercase tracking-widest transition-all border-2 border-slate-700 hover:border-brand-blue"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-3">
                      <input 
                        type="text"
                        placeholder="e.g. Add a red scarf..."
                        className="anime-input flex-1"
                        value={editPrompt}
                        onChange={e => setEditPrompt(e.target.value)}
                      />
                      <button
                        onClick={handleEdit}
                        disabled={editing || !editPrompt}
                        className="anime-button px-10"
                      >
                        {editing ? <RefreshCw className="w-6 h-6 animate-spin" /> : <Check className="w-6 h-6" />}
                        Apply
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="mt-32 border-t border-slate-800/50 py-16 bg-slate-950/50 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 text-center space-y-8 relative z-10">
          <div className="flex justify-center gap-12">
            {[Zap, Heart, Sparkles, Sword, Brain].map((Icon, i) => (
              <motion.div
                key={i}
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity, delay: i * 0.5 }}
              >
                <Icon className="w-8 h-8 text-slate-700 hover:text-brand-blue transition-colors cursor-pointer" />
              </motion.div>
            ))}
          </div>
          <div className="space-y-2">
            <h5 className="font-display font-black text-xl text-white uppercase italic tracking-widest">AnimeForge v2.0</h5>
            <p className="text-slate-500 text-sm font-medium uppercase tracking-[0.3em]">Built for the next generation of Otaku</p>
          </div>
          <div className="flex justify-center gap-4">
            <div className="px-4 py-1 bg-slate-900 border border-slate-800 rounded-full text-[10px] font-black text-slate-500 uppercase tracking-widest">
              Powered by Gemini AI
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
